from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func

from app.core.database import get_db

from app.models.user import User
from app.models.kyc import KYC
from app.models.seller import Seller
from app.models.investments import Investment
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.mining_log import MiningLog
from app.models.system_config import SystemConfig
from app.models.transfer_log import TransferLog
from app.models.ofa_coin_transaction import OFACoinTransaction, OFATransactionType
from app.models.wallet_transaction import WalletTransaction
from app.schemas.user import UserCreate, UserResponse, UserLogin, LoginResponse, IdentityVerificationRequest, ForgotPasswordRequest, ResetPasswordRequest, UserRefreshResponse, ReferralNetworkResponse, WalletTransferRequest, WalletTransferResponse, ConvertOFARequest, ConvertOFAResponse, ProfileImageUpdateRequest, SendFundsRequest, TransferMatchingBonusRequest, TransferHistoryResponse, TransferLogSchema
from app.core.rate_limiter import limiter

from app.api.v1.deps import get_current_user, check_earning_access
from app.utils.is_system_active import is_system_active
from app.services.b2_service import upload_to_b2, generate_presigned_url
from app.utils.notifications import notify_admin

from app.core.referral import get_referral_level_rates

WALLET_PRECISION = Decimal("0.00000000000001")
MINING_CYCLE_SECONDS = 86400  # 24 hours


async def _create_ofa_tx(
    db: AsyncSession,
    user_id: int,
    tx_type: OFATransactionType,
    amount: Decimal,
    balance_before: Decimal,
    balance_after: Decimal,
    target_wallet: str,
    reference_type: str | None = None,
    reference_id: int | None = None,
    idempotency_key: str | None = None,
    description: str | None = None,
) -> OFACoinTransaction:
    tx = OFACoinTransaction(
        user_id=user_id,
        tx_type=tx_type,
        amount=amount,
        wallet_balance_before=balance_before,
        wallet_balance_after=balance_after,
        target_wallet=target_wallet,
        reference_type=reference_type,
        reference_id=reference_id,
        idempotency_key=idempotency_key,
        description=description,
    )
    db.add(tx)
    return tx


def _resolve_profile_image_url(stored: str | None) -> str | None:
    if not stored:
        return None
    if stored.startswith("http://") or stored.startswith("https://"):
        return stored
    return generate_presigned_url(stored, expires_in=604800)


async def _get_mining_cap(db: AsyncSession) -> Decimal:
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "mining_daily_cap")
    )
    config = result.scalar_one_or_none()
    if config and config.value:
        try:
            return Decimal(config.value)
        except Exception:
            pass
    return Decimal("20")


async def _is_mining_enabled(db: AsyncSession) -> bool:
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "mining_enabled")
    )
    config = result.scalar_one_or_none()
    if config is not None:
        return config.value.lower() == "true"
    return True


router = APIRouter(prefix="/user", tags=["User"])


@router.get("/conversion-rate")
@limiter.limit("120/minute")
async def get_ofa_conversion_rate(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == "ofa_to_usdt_rate"))
    cfg = result.scalar_one_or_none()
    rate = Decimal(cfg.value) if cfg and cfg.value else Decimal("0.0001")
    return {
        "ofa_to_usdt_rate": float(rate),
        "rate": f"1 OFA = {float(rate)} USDT",
    }


@router.get("/me", response_model=UserRefreshResponse)
@limiter.limit("400/minute")
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kyc_result = await db.execute(select(KYC).where(KYC.user_id == current_user.id))
    seller_result = await db.execute(
        select(Seller).where(Seller.user_id == current_user.id, Seller.status == "approved")
    )

    kyc = kyc_result.scalar_one_or_none()
    seller = seller_result.scalar_one_or_none()

    # Ensure team_volume is live — recalculate if stored value is zero.
    # Rank-eligible volume is zero until KYC is approved (and only counts
    # deposits made at/after approval), so non-approved users cache zero.
    if not current_user.team_volume:
        from app.services.rank_service import get_rank_eligible_volume
        _pv, _tv = await get_rank_eligible_volume(current_user, db)
        current_user.team_volume = _tv
        db.add(current_user)
        await db.commit()

    user_resp = UserResponse.model_validate(current_user)
    if kyc:
        user_resp.phone_number = kyc.phone_number
        user_resp.country = kyc.country

    user_resp.profile_image_url = _resolve_profile_image_url(current_user.profile_image_url)

    kyc_fee_refunded = bool(kyc and kyc.payment_status and kyc.payment_status.value == "refunded")

    return {
        "user": user_resp,
        "doc_submitted": bool(kyc and kyc.document_number),
        "kyc_status": kyc.status.value if kyc else None,
        "kyc_note": kyc.admin_note if kyc else None,
        "kyc_fee_refunded": kyc_fee_refunded,
        "has_active_seller": seller is not None,
    }


@router.get("/referral-network")
@limiter.limit("120/minute")
async def get_referral_network(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text

    rates = await get_referral_level_rates(db)
    display_rates = {lvl: f"{int(r)}%" if r == int(r) else f"{r}%" for lvl, r in rates.items()}

    team_stmt = text("""
        WITH RECURSIVE team_tree AS (
            SELECT id, 1 AS depth
            FROM users
            WHERE parent_lvl_1_id = :user_id
            UNION ALL
            SELECT u.id, tt.depth + 1
            FROM users u
            INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
            WHERE tt.depth < :max_depth
        )
        SELECT id, depth FROM team_tree
    """)
    team_rows = await db.execute(team_stmt, {"user_id": current_user.id, "max_depth": 999})
    team_data = team_rows.fetchall()

    total_team_members = len(team_data)
    if not team_data:
        return {
            "total_team_members": 0,
            "total_referrals": 0,
            "total_active_referrals": 0,
            "bonus_eligible_members": 0,
            "non_bonus_members": 0,
            "levels": [
                {
                    "level": level,
                    "commission_rate": display_rates[level],
                    "total_earnings": Decimal("0"),
                    "users": [],
                }
                for level in range(1, 6)
            ],
        }

    bonus_eligible_ids = {row[0] for row in team_data if row[1] <= 5}
    non_bonus_ids = {row[0] for row in team_data if row[1] > 5}

    team_users_result = await db.execute(
        select(User).where(User.id.in_([row[0] for row in team_data]))
    )
    team_users = team_users_result.scalars().all()
    team_users_map = {u.id: u for u in team_users}

    level_map = {1: [], 2: [], 3: [], 4: [], 5: []}

    l1_user_ids = {uid for uid, d in team_data if d == 1}
    parent_ids = {
        team_users_map[uid].parent_lvl_1_id
        for uid in l1_user_ids
        if uid in team_users_map and team_users_map[uid].parent_lvl_1_id
    }
    parent_usernames = {}
    if parent_ids:
        parent_result = await db.execute(
            select(User.id, User.username).where(User.id.in_(parent_ids))
        )
        parent_usernames = {pid: username for pid, username in parent_result.all()}

    candidate_ids = [current_user.id] + [row[0] for row in team_data]
    direct_counts_result = await db.execute(
        select(User.parent_lvl_1_id, func.count(User.id))
        .where(User.parent_lvl_1_id.in_(candidate_ids))
        .group_by(User.parent_lvl_1_id)
    )
    direct_counts = {pid: count for pid, count in direct_counts_result.all() if pid}

    all_team_ids = [row[0] for row in team_data]
    active_result = await db.execute(
        select(Investment.user_id).where(
            Investment.status == "active",
            Investment.user_id.in_(all_team_ids),
        )
    )
    active_user_ids = {row[0] for row in active_result.all()}

    total_active_referrals = 0

    for uid, depth in team_data:
        member = team_users_map.get(uid)
        if not member:
            continue

        if depth <= 5:
            total_active_referrals += 1

        member_earnings = (member.referral_wallet or Decimal("0")) + (
            member.generation_wallet or Decimal("0")
        )

        status = "active" if member.id in active_user_ids else "inactive"

        member_data = {
            "id": member.id,
            "user_no": member.user_no,
            "name": member.full_name,
            "username": member.username,
            "level": depth,
            "join_date": member.created_at.strftime("%b %d, %Y"),
            "total_earnings": member_earnings,
            "referred_by": parent_usernames.get(member.parent_lvl_1_id),
            "direct_referrals": direct_counts.get(member.id, 0),
            "status": status,
        }

        if depth <= 5:
            level_map[depth].append(member_data)

    # Calculate level-wise commissions the current user earned
    rph_result = await db.execute(
        select(ReferralProfitHistory).where(
            ReferralProfitHistory.receiver_user_id == current_user.id
        )
    )
    earned_by_level = {1: Decimal("0"), 2: Decimal("0"), 3: Decimal("0"), 4: Decimal("0"), 5: Decimal("0")}
    for row in rph_result.scalars().all():
        if row.level in earned_by_level:
            earned_by_level[row.level] += row.amount

    levels = []
    for level in range(1, 6):
        users = level_map[level]
        levels.append(
            {
                "level": level,
                "commission_rate": display_rates[level],
                "total_earnings": earned_by_level[level],
                "users": users,
            }
        )

    return {
        "total_team_members": total_team_members,
        "total_referrals": len(bonus_eligible_ids),
        "total_active_referrals": total_active_referrals,
        "bonus_eligible_members": len(bonus_eligible_ids),
        "non_bonus_members": len(non_bonus_ids),
        "levels": levels,
    }


@router.post("/start-mining")
@limiter.limit("10/minute")
async def start_mining(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await is_system_active("daily_work", db):
        raise HTTPException(status_code=403, detail="Daily work is currently paused (weekend/system maintenance)")
    if not await _is_mining_enabled(db):
        raise HTTPException(status_code=403, detail="Mining is currently disabled by admin")
    check_earning_access(current_user)

    now_utc = datetime.now(timezone.utc)

    # Lock the user row to prevent concurrent mining operations
    user_lock_result = await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    locked_user = user_lock_result.scalar_one_or_none()
    if not locked_user:
        raise HTTPException(status_code=404, detail="User not found")

    # If already mining and 24h passed, auto-reset the cycle first
    if locked_user.mining_active and locked_user.mining_started_at:
        cycle_end = locked_user.mining_started_at + timedelta(seconds=MINING_CYCLE_SECONDS)
        if now_utc >= cycle_end:
            locked_user.mining_active = False
            locked_user.daily_mined = Decimal("0")
            locked_user.mining_started_at = None
            locked_user.last_mine_time = None
        else:
            raise HTTPException(status_code=400, detail="Mining already active. Use claim to collect rewards.")

    # Start new mining session
    locked_user.mining_active = True
    locked_user.mining_started_at = now_utc
    locked_user.daily_mined = Decimal("0")
    locked_user.last_mine_time = now_utc

    await db.commit()
    await db.refresh(locked_user)

    cap = await _get_mining_cap(db)
    return {
        "message": "Mining started",
        "mining_active": locked_user.mining_active,
        "mining_started_at": locked_user.mining_started_at.isoformat() if locked_user.mining_started_at else None,
        "daily_mined": float(locked_user.daily_mined or 0),
        "daily_cap": float(cap),
        "arbx_mining_wallet": float(locked_user.arbx_mining_wallet or 0),
    }


@router.post("/claim-mining")
@limiter.limit("60/minute")
async def claim_mining(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str | None = None,
):
    if not await is_system_active("daily_work", db):
        raise HTTPException(status_code=403, detail="Daily work is currently paused (weekend/system maintenance)")
    if not await _is_mining_enabled(db):
        raise HTTPException(status_code=403, detail="Mining is currently disabled by admin")
    check_earning_access(current_user)

    # Re-fetch user with row-level lock to prevent race conditions
    user_lock_result = await db.execute(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    locked_user = user_lock_result.scalar_one_or_none()
    if not locked_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not locked_user.mining_active or not locked_user.mining_started_at:
        raise HTTPException(status_code=400, detail="No active mining session. Start mining first.")

    # Idempotency check — prevent duplicate claim with same key
    if idempotency_key:
        existing_tx = await db.execute(
            select(OFACoinTransaction).where(
                OFACoinTransaction.idempotency_key == idempotency_key,
                OFACoinTransaction.user_id == locked_user.id,
            )
        )
        if existing_tx.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="This claim has already been processed.")

    now_utc = datetime.now(timezone.utc)
    cap = await _get_mining_cap(db)
    daily_mined = Decimal(str(locked_user.daily_mined or 0))
    remaining = cap - daily_mined

    cycle_end = locked_user.mining_started_at + timedelta(seconds=MINING_CYCLE_SECONDS)
    if now_utc >= cycle_end:
        reference_time = locked_user.last_mine_time or locked_user.mining_started_at
        final_reward = Decimal("0")
        if reference_time < cycle_end:
            final_elapsed = max(0, int((cycle_end - reference_time).total_seconds()))
            per_second_rate = cap / Decimal(str(MINING_CYCLE_SECONDS))
            final_accrued = per_second_rate * Decimal(str(final_elapsed))
            final_reward = min(final_accrued, remaining).quantize(WALLET_PRECISION)
            if final_reward > 0:
                bal_before = locked_user.arbx_mining_wallet or Decimal("0")
                locked_user.arbx_mining_wallet = bal_before + final_reward
                locked_user.daily_mined = daily_mined + final_reward
                db.add(MiningLog(
                    user_id=locked_user.id,
                    amount=final_reward,
                    mined_from=reference_time,
                    mined_to=cycle_end,
                    daily_mined_after=locked_user.daily_mined,
                ))
                await _create_ofa_tx(
                    db, locked_user.id,
                    tx_type=OFATransactionType.mining_reward,
                    amount=final_reward,
                    balance_before=bal_before,
                    balance_after=locked_user.arbx_mining_wallet,
                    target_wallet="arbx_mining_wallet",
                    reference_type="mining_log",
                    idempotency_key=idempotency_key,
                    description="Daily mining reward (cycle end)",
                )
                await notify_admin(
                    db=db, type="mining_claimed",
                    message=f"User {locked_user.full_name} claimed {float(final_reward)} OFA mining reward (cycle end)",
                    user_id=locked_user.id, request=request,
                )
        locked_user.mining_active = False
        locked_user.daily_mined = Decimal("0")
        locked_user.mining_started_at = None
        locked_user.last_mine_time = None
        await db.commit()
        return {
            "message": "Mining cycle ended. Start a new mining session.",
            "reward": float(final_reward),
            "daily_mined": float(locked_user.daily_mined),
            "daily_cap": float(cap),
            "remaining_today": float(cap),
            "arbx_mining_wallet": float(locked_user.arbx_mining_wallet or 0),
            "mining_active": locked_user.mining_active,
        }

    if remaining <= 0:
        locked_user.mining_active = False
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Daily cap of {cap} OFA reached. Wait for next cycle.")

    reference_time = locked_user.last_mine_time or locked_user.mining_started_at
    elapsed_seconds = max(0, int((now_utc - reference_time).total_seconds()))
    r = await db.execute(select(SystemConfig).where(SystemConfig.key == "mining_claim_cooldown_minutes"))
    cc = r.scalar_one_or_none()
    cooldown_seconds = (int(cc.value) if cc and cc.value else 1) * 60
    if elapsed_seconds < cooldown_seconds:
        raise HTTPException(status_code=400, detail=f"Wait at least {cooldown_seconds // 60} minute(s) between claims.")

    per_second_rate = cap / Decimal(str(MINING_CYCLE_SECONDS))
    accrued = per_second_rate * Decimal(str(elapsed_seconds))
    reward = min(accrued, remaining).quantize(WALLET_PRECISION)

    if reward <= 0:
        raise HTTPException(status_code=400, detail="No rewards to claim yet.")

    bal_before = locked_user.arbx_mining_wallet or Decimal("0")
    locked_user.arbx_mining_wallet = bal_before + reward
    locked_user.daily_mined = daily_mined + reward
    locked_user.last_mine_time = now_utc

    db.add(MiningLog(
        user_id=locked_user.id,
        amount=reward,
        mined_from=reference_time,
        mined_to=now_utc,
        daily_mined_after=locked_user.daily_mined,
    ))

    await _create_ofa_tx(
        db, locked_user.id,
        tx_type=OFATransactionType.mining_reward,
        amount=reward,
        balance_before=bal_before,
        balance_after=locked_user.arbx_mining_wallet,
        target_wallet="arbx_mining_wallet",
        reference_type="mining_log",
        idempotency_key=idempotency_key,
        description="Daily mining reward",
    )

    await db.commit()
    await db.refresh(locked_user)

    await notify_admin(
        db=db, type="mining_claimed",
        message=f"User {locked_user.full_name} claimed {float(reward)} OFA mining reward",
        user_id=locked_user.id, request=request,
    )

    return {
        "message": "Mining reward claimed",
        "reward": float(reward),
        "daily_mined": float(locked_user.daily_mined),
        "daily_cap": float(cap),
        "remaining_today": float(cap - locked_user.daily_mined),
        "arbx_mining_wallet": float(locked_user.arbx_mining_wallet or 0),
        "mining_active": locked_user.mining_active,
    }


@router.get("/mining-status")
@limiter.limit("120/minute")
async def get_mining_status(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cap = await _get_mining_cap(db)
    now_utc = datetime.now(timezone.utc)
    cycle_end = None
    time_remaining = None

    if current_user.mining_active and current_user.mining_started_at:
        cycle_end = current_user.mining_started_at + timedelta(seconds=MINING_CYCLE_SECONDS)
        if now_utc >= cycle_end:
            time_remaining = "cycle_ended"
        else:
            remaining_delta = cycle_end - now_utc
            time_remaining = int(remaining_delta.total_seconds())

    return {
        "mining_active": current_user.mining_active,
        "mining_started_at": current_user.mining_started_at.isoformat() if current_user.mining_started_at else None,
        "daily_mined": float(current_user.daily_mined or 0),
        "daily_cap": float(cap),
        "remaining_today": float(cap - Decimal(str(current_user.daily_mined or 0))),
        "arbx_mining_wallet": float(current_user.arbx_mining_wallet or 0),
        "cycle_end": cycle_end.isoformat() if cycle_end else None,
        "time_remaining_seconds": time_remaining,
    }


@router.get("/earnings-history")
@limiter.limit("120/minute")
async def get_earnings_history(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all referral and generation profit history for the current user."""
    result = await db.execute(
        select(ReferralProfitHistory)
        .where(ReferralProfitHistory.receiver_user_id == current_user.id)
        .order_by(ReferralProfitHistory.created_at.desc())
        .limit(100)
    )
    items = result.scalars().all()

    # Collect source user IDs to resolve usernames
    source_ids = {item.source_user_id for item in items}
    usernames: dict[int, str] = {}
    if source_ids:
        uname_result = await db.execute(
            select(User.id, User.username).where(User.id.in_(source_ids))
        )
        usernames = {uid: uname for uid, uname in uname_result.all()}

    data = [
        {
            "id": item.id,
            "amount": float(item.amount),
            "level": item.level,
            "percentage": float(item.percentage),
            "type": item.type,
            "wallet_type": "referral" if item.level == 1 else "generation",
            "from_username": usernames.get(item.source_user_id, "-"),
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in items
    ]

    return {"data": data}


@router.get("/referral-bonuses")
@limiter.limit("120/minute")
async def get_referral_bonuses(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return paginated direct referral bonus history for the current user."""
    base_where = and_(
        ReferralProfitHistory.receiver_user_id == current_user.id,
        ReferralProfitHistory.type == "deposit_referral",
    )
    if search and search.strip():
        sq = search.strip()
        like = f"%{sq}%"
        subq = select(User.id).where(
            or_(User.full_name.ilike(like), User.username.ilike(like))
        ).subquery()
        base_where = and_(base_where, ReferralProfitHistory.source_user_id.in_(select(subq.c.id)))

    count_q = await db.execute(
        select(func.count(ReferralProfitHistory.id)).where(base_where)
    )
    total = count_q.scalar() or 0

    rows = await db.execute(
        select(ReferralProfitHistory)
        .where(base_where)
        .order_by(ReferralProfitHistory.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = rows.scalars().all()

    source_ids = {i.source_user_id for i in items}
    unames = {}
    if source_ids:
        r = await db.execute(select(User.id, User.full_name, User.username).where(User.id.in_(source_ids)))
        for uid, fn, un in r.all():
            unames[uid] = {"full_name": fn, "username": un}

    data = [
        {
            "id": item.id,
            "source_user_id": item.source_user_id,
            "source_name": unames.get(item.source_user_id, {}).get("full_name", "-"),
            "source_username": unames.get(item.source_user_id, {}).get("username", "-"),
            "amount": float(item.amount),
            "percentage": float(item.percentage),
            "deposit_id": item.deposit_id,
            "level": item.level,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "status": "completed",
        }
        for item in items
    ]

    return {"total": total, "page": page, "limit": limit, "data": data}


@router.get("/generation-bonuses")
@limiter.limit("120/minute")
async def get_generation_bonuses(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    level: int | None = Query(None, ge=2, le=5, description="Filter by generation level (2-5)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return paginated generation bonus history for the current user (levels 2-5 from all bonus types)."""
    base_where = and_(
        ReferralProfitHistory.receiver_user_id == current_user.id,
        ReferralProfitHistory.level >= 2,
        ReferralProfitHistory.level <= 5,
    )
    if level:
        base_where = and_(base_where, ReferralProfitHistory.level == level)
    if search and search.strip():
        sq = search.strip()
        like = f"%{sq}%"
        subq = select(User.id).where(
            or_(User.full_name.ilike(like), User.username.ilike(like))
        ).subquery()
        base_where = and_(base_where, ReferralProfitHistory.source_user_id.in_(select(subq.c.id)))

    count_q = await db.execute(
        select(func.count(ReferralProfitHistory.id)).where(base_where)
    )
    total = count_q.scalar() or 0

    rows = await db.execute(
        select(ReferralProfitHistory)
        .where(base_where)
        .order_by(ReferralProfitHistory.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    items = rows.scalars().all()

    source_ids = {i.source_user_id for i in items}
    unames = {}
    if source_ids:
        r = await db.execute(select(User.id, User.full_name, User.username).where(User.id.in_(source_ids)))
        for uid, fn, un in r.all():
            unames[uid] = {"full_name": fn, "username": un}

    level_labels = {2: "2nd Generation", 3: "3rd Generation", 4: "4th Generation", 5: "5th Generation"}

    data = [
        {
            "id": item.id,
            "source_user_id": item.source_user_id,
            "source_name": unames.get(item.source_user_id, {}).get("full_name", "-"),
            "source_username": unames.get(item.source_user_id, {}).get("username", "-"),
            "amount": float(item.amount),
            "percentage": float(item.percentage),
            "deposit_id": item.deposit_id,
            "investment_id": item.investment_id,
            "level": item.level,
            "level_label": level_labels.get(item.level, f"{item.level}th Generation"),
            "type": item.type,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "status": "completed",
        }
        for item in items
    ]

    return {"total": total, "page": page, "limit": limit, "data": data}


@router.get("/profit-history")
@limiter.limit("120/minute")
async def get_profit_history(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all investment daily profit credits for the current user."""
    inv_result = await db.execute(
        select(Investment.id, Investment.package_name)
        .where(Investment.user_id == current_user.id)
    )
    investments = inv_result.all()
    if not investments:
        return {"data": []}

    investment_ids = [row.id for row in investments]
    pkg_names = {row.id: row.package_name for row in investments}

    history_result = await db.execute(
        select(InvestmentProfitHistory)
        .where(InvestmentProfitHistory.investment_id.in_(investment_ids))
        .order_by(InvestmentProfitHistory.created_at.desc())
        .limit(100)
    )
    items = history_result.scalars().all()

    return {
        "data": [
            {
                "id": item.id,
                "amount": float(item.amount),
                "percentage": float(item.percentage),
                "package_name": pkg_names.get(item.investment_id, ""),
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ]
    }


@router.get("/statistics")
async def get_user_statistics_public(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    active_users_result = await db.execute(
        select(func.count(User.id)).where(User.account_status == "active")
    )
    active_users = active_users_result.scalar() or 0

    inactive_users_result = await db.execute(
        select(func.count(User.id)).where(User.account_status != "active")
    )
    inactive_users = inactive_users_result.scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
    }


@router.post("/wallet-transfer", response_model=WalletTransferResponse)
@limiter.limit("30/minute")
async def wallet_transfer(
    request: Request,
    data: WalletTransferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.from_wallet == data.to_wallet:
        raise HTTPException(status_code=400, detail="Source and destination wallets must be different")

    if data.from_wallet == "ecommerce_wallet":
        seller = await db.execute(
            select(Seller).where(Seller.user_id == current_user.id, Seller.status == "approved")
        )
        if not seller.scalar_one_or_none():
            raise HTTPException(403, "You must create and activate a Seller Account before transferring funds from your eCommerce Wallet.")

    amount = Decimal(str(data.amount)).quantize(WALLET_PRECISION)
    from_balance = getattr(current_user, data.from_wallet) or Decimal("0")
    to_balance = getattr(current_user, data.to_wallet) or Decimal("0")

    if from_balance < amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance in {data.from_wallet}")

    setattr(current_user, data.from_wallet, (from_balance - amount).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP))
    setattr(current_user, data.to_wallet, (to_balance + amount).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP))

    transfer = TransferLog(
        sender_id=current_user.id,
        receiver_id=current_user.id,
        amount=amount,
        fee=Decimal("0"),
        note=f"{data.from_wallet} → {data.to_wallet}",
        status="completed",
    )
    db.add(transfer)
    await db.commit()
    await db.refresh(current_user)

    await notify_admin(
        db=db, type="wallet_transfer",
        message=f"User {current_user.full_name} transferred {float(amount)} from {data.from_wallet} to {data.to_wallet}",
        user_id=current_user.id, request=request,
    )

    return WalletTransferResponse(
        message=f"Transfer of {float(amount)} from {data.from_wallet} to {data.to_wallet} completed",
        from_wallet=data.from_wallet,
        to_wallet=data.to_wallet,
        amount=float(amount),
        from_balance=float(getattr(current_user, data.from_wallet)),
        to_balance=float(getattr(current_user, data.to_wallet)),
    )


@router.post("/convert-ofa-to-usdt", response_model=ConvertOFAResponse)
@limiter.limit("30/minute")
async def convert_ofa_to_usdt(
    request: Request,
    data: ConvertOFARequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_earning_access(current_user)
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == "ofa_to_usdt_rate"))
    cfg = result.scalar_one_or_none()
    OFA_TO_USDT_RATE = Decimal(cfg.value) if cfg and cfg.value else Decimal("0.0001")
    ofa_amount = Decimal(str(data.ofa_amount)).quantize(WALLET_PRECISION)
    usdt_amount = (ofa_amount * OFA_TO_USDT_RATE).quantize(WALLET_PRECISION)

    arbx_balance = current_user.arbx_wallet or Decimal("0")
    if arbx_balance < ofa_amount:
        raise HTTPException(status_code=400, detail=f"Insufficient OFA balance. You have {float(arbx_balance)} OFA")

    new_arbx = (arbx_balance - ofa_amount).quantize(WALLET_PRECISION)
    current_user.arbx_wallet = new_arbx
    main_balance = current_user.main_wallet or Decimal("0")
    new_main = (main_balance + usdt_amount).quantize(WALLET_PRECISION)
    current_user.main_wallet = new_main

    await _create_ofa_tx(
        db, current_user.id,
        tx_type=OFATransactionType.ofa_to_usdt,
        amount=ofa_amount.quantize(WALLET_PRECISION),
        balance_before=arbx_balance,
        balance_after=new_arbx,
        target_wallet="arbx_wallet",
        reference_type="conversion",
        description=f"Converted {float(ofa_amount)} OFA to {float(usdt_amount)} USDT",
    )

    await db.commit()
    await db.refresh(current_user)

    await notify_admin(
        db=db, type="ofa_converted",
        message=f"User {current_user.full_name} converted {float(ofa_amount)} OFA to {float(usdt_amount)} USDT",
        user_id=current_user.id, request=request,
    )

    rate_str = f"1 OFA = {float(OFA_TO_USDT_RATE)} USDT"
    return ConvertOFAResponse(
        message=f"Converted {float(ofa_amount)} OFA to {float(usdt_amount)} USDT",
        ofa_amount=float(ofa_amount),
        usdt_amount=float(usdt_amount),
        arbx_wallet_balance=float(current_user.arbx_wallet),
        main_wallet_balance=float(current_user.main_wallet),
        rate=rate_str,
    )


@router.post("/profile-image")
@limiter.limit("10/minute")
async def update_profile_image(
    request: Request,
    data: ProfileImageUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.profile_image_url = data.profile_image_url
    await db.commit()
    await db.refresh(current_user)

    return {
        "message": "Profile image updated",
        "profile_image_url": current_user.profile_image_url,
    }


@router.post("/profile-image/upload")
@limiter.limit("10/minute")
async def upload_profile_image(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(400, detail="Only JPEG, PNG, WebP, and GIF images are allowed.")

    object_key = await upload_to_b2(file, f"profiles/{current_user.id}")

    current_user.profile_image_url = object_key
    await db.commit()

    fresh_url = generate_presigned_url(object_key, expires_in=604800)

    await notify_admin(
        db=db, type="profile_updated",
        message=f"User {current_user.full_name} updated their profile image",
        user_id=current_user.id, request=request,
    )

    return {
        "message": "Profile image uploaded",
        "profile_image_url": fresh_url,
    }


@router.post("/send-funds")
@limiter.limit("30/minute")
async def send_funds(
    request: Request,
    data: SendFundsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_earning_access(current_user)
    amount = Decimal(str(data.amount)).quantize(WALLET_PRECISION)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    if current_user.main_wallet is None or current_user.main_wallet < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance in main wallet")

    # Find recipient by email, username, or ID
    recipient = None
    query = data.recipient.strip()
    if query.isdigit():
        recipient_result = await db.execute(select(User).where(User.id == int(query)))
        recipient = recipient_result.scalar_one_or_none()
    if not recipient:
        recipient_result = await db.execute(
            select(User).where(or_(User.email == query, User.username == query))
        )
        recipient = recipient_result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send funds to yourself")

    # Read transfer charge from config
    charge_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "transfer_charge_percent")
    )
    charge_config = charge_result.scalar_one_or_none()
    charge_percent = Decimal(charge_config.value) if charge_config and charge_config.value else Decimal("5")
    charge_amount = (amount * charge_percent / Decimal("100")).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)

    total_deduction = amount  # sender loses the full amount they specified
    receiver_gets = amount - charge_amount  # receiver gets amount minus charge

    if receiver_gets <= 0:
        raise HTTPException(status_code=400, detail="Amount too small after charge deduction")

    # Transfer funds with charge
    current_user.main_wallet = (current_user.main_wallet - total_deduction).quantize(WALLET_PRECISION)
    recipient.main_wallet = (recipient.main_wallet or Decimal("0")) + receiver_gets

    # Log transfer
    transfer = TransferLog(
        sender_id=current_user.id,
        receiver_id=recipient.id,
        amount=receiver_gets,
        fee=charge_amount,
        note=data.note,
        status="completed",
    )
    db.add(transfer)
    await db.commit()
    await db.refresh(current_user)

    await notify_admin(
        db=db, type="send_funds",
        message=f"User {current_user.full_name} sent {float(receiver_gets)} USDT to {recipient.full_name} ({recipient.email})",
        user_id=current_user.id, request=request,
    )

    return {
        "message": f"Sent {float(receiver_gets)} USDT to {recipient.full_name}",
        "amount": float(receiver_gets),
        "charge": float(charge_amount),
        "charge_percent": float(charge_percent),
        "recipient": recipient.full_name,
        "recipient_email": recipient.email,
        "new_balance": float(current_user.main_wallet),
        "transfer_id": transfer.id,
    }


@router.post("/transfer-matching-bonus")
@limiter.limit("30/minute")
async def transfer_matching_bonus(
    request: Request,
    data: TransferMatchingBonusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_earning_access(current_user)
    amount = Decimal(str(data.amount)).quantize(WALLET_PRECISION)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    mb_balance = current_user.matching_bonus_wallet or Decimal("0")
    if mb_balance < amount:
        raise HTTPException(status_code=400, detail=f"Insufficient matching bonus balance. Available: {float(mb_balance)} USDT")

    # Find recipient by email, username, or ID
    recipient = None
    query = data.recipient.strip()
    if query.isdigit():
        recipient_result = await db.execute(select(User).where(User.id == int(query)))
        recipient = recipient_result.scalar_one_or_none()
    if not recipient:
        recipient_result = await db.execute(
            select(User).where(or_(User.email == query, User.username == query))
        )
        recipient = recipient_result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if recipient.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")

    # Read transfer charge from config
    charge_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "transfer_charge_percent")
    )
    charge_config = charge_result.scalar_one_or_none()
    charge_percent = Decimal(charge_config.value) if charge_config and charge_config.value else Decimal("5")
    charge_amount = (amount * charge_percent / Decimal("100")).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)

    receiver_gets = amount - charge_amount

    if receiver_gets <= 0:
        raise HTTPException(status_code=400, detail="Amount too small after charge deduction")

    # Deduct from sender's matching bonus wallet
    current_user.matching_bonus_wallet = (mb_balance - amount).quantize(WALLET_PRECISION)
    # Credit recipient's main wallet
    recipient.main_wallet = (recipient.main_wallet or Decimal("0")) + receiver_gets

    # Log transfer
    transfer = TransferLog(
        sender_id=current_user.id,
        receiver_id=recipient.id,
        amount=receiver_gets,
        fee=charge_amount,
        note=data.note or "Matching bonus transfer",
        status="completed",
    )
    db.add(transfer)
    await db.commit()
    await db.refresh(current_user)

    await notify_admin(
        db=db, type="matching_bonus_transfer",
        message=f"User {current_user.full_name} transferred {float(receiver_gets)} USDT from matching bonus to {recipient.full_name} ({recipient.email})",
        user_id=current_user.id, request=request,
    )

    return {
        "message": f"Transferred {float(receiver_gets)} USDT from matching bonus to {recipient.full_name}",
        "amount": float(receiver_gets),
        "charge": float(charge_amount),
        "charge_percent": float(charge_percent),
        "recipient": recipient.full_name,
        "recipient_email": recipient.email,
        "new_mb_balance": float(current_user.matching_bonus_wallet),
        "transfer_id": transfer.id,
    }


@router.get("/transfers", response_model=TransferHistoryResponse)
@limiter.limit("60/minute")
async def get_transfer_history(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sent_result = await db.execute(
        select(TransferLog).where(TransferLog.sender_id == current_user.id).order_by(TransferLog.created_at.desc()).limit(50)
    )
    sent_logs = sent_result.scalars().all()

    received_result = await db.execute(
        select(TransferLog).where(TransferLog.receiver_id == current_user.id).order_by(TransferLog.created_at.desc()).limit(50)
    )
    received_logs = received_result.scalars().all()

    user_ids = {current_user.id}
    for tx in sent_logs:
        user_ids.add(tx.receiver_id)
        user_ids.add(tx.sender_id)
    for tx in received_logs:
        user_ids.add(tx.sender_id)
        user_ids.add(tx.receiver_id)
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    user_map = {u.id: u.full_name for u in users_result.scalars().all()}

    def enrich(tx: TransferLog, as_sender: bool) -> TransferLogSchema:
        other_id = tx.receiver_id if as_sender else tx.sender_id
        return TransferLogSchema(
            id=tx.id,
            sender_id=tx.sender_id,
            sender_name=user_map.get(tx.sender_id, ""),
            receiver_id=tx.receiver_id,
            receiver_name=user_map.get(tx.receiver_id, ""),
            amount=float(tx.amount),
            note=tx.note,
            status=tx.status,
            created_at=tx.created_at.isoformat() if tx.created_at else "",
        )

    return TransferHistoryResponse(
        sent=[enrich(t, True) for t in sent_logs],
        received=[enrich(t, False) for t in received_logs],
    )


@router.get("/list")
async def get_user_list(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=50),
    search: str | None = Query(None, description="Search by email, username, or full name"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit

    # Non-admin users may only look up a specific recipient (Fund Send / MB Transfer).
    # Full user listing stays an admin-only capability so user data is not enumerated.
    if not current_user.is_admin and not (search and search.strip()):
        return {"total": 0, "page": page, "limit": limit, "users": []}

    base_query = select(User)
    count_query = select(func.count(User.id))

    if search:
        q = search.strip()
        like = f"%{q}%"
        filter_cond = or_(
            User.email.ilike(like),
            User.username.ilike(like),
            User.full_name.ilike(like),
        )
        if q.isdigit():
            filter_cond = or_(filter_cond, User.id == int(q))
        base_query = base_query.where(filter_cond)
        count_query = count_query.where(filter_cond)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    users_result = await db.execute(
        base_query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    )
    users = users_result.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": [
            {
                "id": u.id,
                "user_no": u.user_no,
                "full_name": u.full_name,
                "email": u.email,
                "username": u.username,
                "status": "active" if u.account_status == "active" else "inactive",
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.get("/fee-info")
async def get_fee_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "kyc_fee")
    )
    cfg = result.scalar_one_or_none()
    kyc_fee = Decimal(cfg.value) if cfg and cfg.value else Decimal("0")

    kyc_result = await db.execute(
        select(KYC).where(KYC.user_id == current_user.id)
    )
    existing_kyc = kyc_result.scalar_one_or_none()

    return {
        "kyc_fee": str(kyc_fee),
        "has_kyc": existing_kyc is not None,
        "kyc_status": existing_kyc.status.value if existing_kyc else None,
        "kyc_note": existing_kyc.admin_note if existing_kyc else None,
        "kyc_full_name": existing_kyc.full_name if existing_kyc else None,
        "kyc_country": existing_kyc.country if existing_kyc else None,
        "kyc_phone_number": existing_kyc.phone_number if existing_kyc else None,
        "kyc_document_type": existing_kyc.document_type.value if existing_kyc else None,
        "kyc_document_number": existing_kyc.document_number if existing_kyc else None,
        "kyc_front_image_url": _resolve_profile_image_url(existing_kyc.front_image_key) if existing_kyc else None,
        "kyc_back_image_url": _resolve_profile_image_url(existing_kyc.back_image_key) if existing_kyc else None,
    }


@router.get("/mining-history")
@limiter.limit("60/minute")
async def get_my_mining_history(
    request: Request,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    result = await db.execute(
        select(MiningLog)
        .where(MiningLog.user_id == user_id)
        .order_by(MiningLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return {
        "data": [
            {
                "id": m.id,
                "amount": float(m.amount),
                "mined_from": m.mined_from.isoformat(),
                "mined_to": m.mined_to.isoformat(),
                "note": m.note,
                "created_at": m.created_at.isoformat(),
            }
            for m in logs
        ]
    }


@router.get("/wallet-transactions")
async def get_my_wallet_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current user's wallet transactions (KYC fee holds and refunds)."""
    base_query = (
        select(WalletTransaction)
        .where(WalletTransaction.user_id == current_user.id)
        .order_by(WalletTransaction.created_at.desc(), WalletTransaction.id.desc())
    )
    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))
    result = await db.execute(base_query.offset((page - 1) * limit).limit(limit))
    items = result.scalars().all()
    return {
        "total": total or 0,
        "page": page,
        "limit": limit,
        "data": [
            {
                "id": wt.id,
                "transaction_id": wt.id,
                "user_id": wt.user_id,
                "type": wt.type.value if hasattr(wt.type, "value") else wt.type,
                "wallet_type": wt.wallet_type,
                "amount": float(wt.amount),
                "balance_before": float(wt.balance_before) if wt.balance_before is not None else None,
                "balance_after": float(wt.balance_after) if wt.balance_after is not None else None,
                "currency": "USDT",
                "reference_type": wt.reference_type,
                "reference_id": wt.reference_id,
                "description": wt.description,
                "status": wt.status.value if hasattr(wt.status, "value") else wt.status,
                "created_at": wt.created_at.isoformat() if wt.created_at else None,
            }
            for wt in items
        ],
    }
