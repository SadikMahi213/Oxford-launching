from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func

from app.core.database import get_db

from app.models.user import User
from app.models.kyc import KYC
from app.models.investments import Investment
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.mining_log import MiningLog
from app.models.system_config import SystemConfig
from app.schemas.user import UserCreate, UserResponse, UserLogin, LoginResponse, IdentityVerificationRequest, ForgotPasswordRequest, ResetPasswordRequest, ResendVerificationRequest, UserRefreshResponse, ReferralNetworkResponse, WalletTransferRequest, WalletTransferResponse, ConvertOFARequest, ConvertOFAResponse, ProfileImageUpdateRequest
from app.core.rate_limiter import limiter

from app.api.v1.deps import get_current_user
from app.utils.is_system_active import is_system_active
from app.services.b2_service import upload_to_b2, generate_presigned_url

WALLET_PRECISION = Decimal("0.00000000000001")
MINING_CYCLE_SECONDS = 86400  # 24 hours


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

REFERRAL_LEVEL_RATES = {
    1: "10%",
    2: "8%",
    3: "7%",
    4: "6%",
    5: "5%",
}


@router.get("/me", response_model=UserRefreshResponse)
@limiter.limit("400/minute")
async def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    # Fetch latest KYC data
    kyc_result = await db.execute(
        select(KYC).where(KYC.user_id == current_user.id)
    )
    kyc = kyc_result.scalar_one_or_none()

    doc_submitted = bool(kyc and kyc.document_number)
    kyc_status = kyc.status.value if kyc else None

    return {
        "user": UserResponse(
            **current_user.__dict__,
            phone_number=kyc.phone_number if kyc else None,
            country=kyc.country if kyc else None,
        ),
        "doc_submitted": doc_submitted,
        "kyc_status": kyc_status
    }


@router.get("/referral-network", response_model=ReferralNetworkResponse)
@limiter.limit("120/minute")
async def get_referral_network(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    downline_result = await db.execute(
        select(User).where(
            or_(
                User.parent_lvl_1_id == current_user.id,
                User.parent_lvl_2_id == current_user.id,
                User.parent_lvl_3_id == current_user.id,
                User.parent_lvl_4_id == current_user.id,
                User.parent_lvl_5_id == current_user.id,
            )
        )
    )
    downline_users = downline_result.scalars().all()

    level_map = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
    }

    if not downline_users:
        return {
            "total_referrals": 0,
            "total_active_referrals": 0,
            "levels": [
                {
                    "level": level,
                    "commission_rate": REFERRAL_LEVEL_RATES[level],
                    "total_earnings": Decimal("0"),
                    "users": [],
                }
                for level in range(1, 6)
            ],
        }

    parent_ids = {
        user.parent_lvl_1_id for user in downline_users if user.parent_lvl_1_id
    }
    parent_usernames = {}
    if parent_ids:
        parent_result = await db.execute(
            select(User.id, User.username).where(User.id.in_(parent_ids))
        )
        parent_usernames = {pid: username for pid,
                            username in parent_result.all()}

    candidate_ids = [current_user.id] + [u.id for u in downline_users]
    direct_counts_result = await db.execute(
        select(User.parent_lvl_1_id, func.count(User.id))
        .where(User.parent_lvl_1_id.in_(candidate_ids))
        .group_by(User.parent_lvl_1_id)
    )
    direct_counts = {pid: count for pid,
                     count in direct_counts_result.all() if pid}

    downline_ids = [u.id for u in downline_users]

    active_result = await db.execute(
        select(Investment.user_id).where(
            Investment.status == "active",
            Investment.user_id.in_(downline_ids),
        )
    )

    active_user_ids = {row[0] for row in active_result.all()}

    total_active_referrals = 0
    for member in downline_users:
        level = None
        if member.parent_lvl_1_id == current_user.id:
            level = 1
        elif member.parent_lvl_2_id == current_user.id:
            level = 2
        elif member.parent_lvl_3_id == current_user.id:
            level = 3
        elif member.parent_lvl_4_id == current_user.id:
            level = 4
        elif member.parent_lvl_5_id == current_user.id:
            level = 5

        if not level:
            continue

        if member.email_verified:
            total_active_referrals += 1

        member_earnings = (member.referral_wallet or Decimal("0")) + (
            member.generation_wallet or Decimal("0")
        )

        # determine investment status
        status = "active" if member.id in active_user_ids else "inactive"

        level_map[level].append(
            {
                "id": member.id,
                "name": member.full_name,
                "username": member.username,
                "level": level,
                "join_date": member.created_at.strftime("%b %d, %Y"),
                "total_earnings": member_earnings,
                "referred_by": parent_usernames.get(member.parent_lvl_1_id),
                "direct_referrals": direct_counts.get(member.id, 0),
                "status": status,
            }
        )

    levels = []
    for level in range(1, 6):
        users = level_map[level]
        level_total = sum(
            (user_row["total_earnings"] for user_row in users),
            Decimal("0"),
        )
        levels.append(
            {
                "level": level,
                "commission_rate": REFERRAL_LEVEL_RATES[level],
                "total_earnings": level_total,
                "users": users,
            }
        )

    return {
        "total_referrals": len(downline_users),
        "total_active_referrals": total_active_referrals,
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
    if (current_user.account_status or "").lower() == "on_hold":
        raise HTTPException(status_code=403, detail="Your account is on hold. Mining is disabled.")

    now_utc = datetime.now(timezone.utc)

    # If already mining and 24h passed, auto-reset the cycle first
    if current_user.mining_active and current_user.mining_started_at:
        cycle_end = current_user.mining_started_at + timedelta(seconds=MINING_CYCLE_SECONDS)
        if now_utc >= cycle_end:
            current_user.mining_active = False
            current_user.daily_mined = Decimal("0")
            current_user.mining_started_at = None
            current_user.last_mine_time = None
        else:
            raise HTTPException(status_code=400, detail="Mining already active. Use claim to collect rewards.")

    # Start new mining session
    current_user.mining_active = True
    current_user.mining_started_at = now_utc
    current_user.daily_mined = Decimal("0")
    current_user.last_mine_time = now_utc

    await db.commit()
    await db.refresh(current_user)

    cap = await _get_mining_cap(db)
    return {
        "message": "Mining started",
        "mining_active": current_user.mining_active,
        "mining_started_at": current_user.mining_started_at.isoformat() if current_user.mining_started_at else None,
        "daily_mined": float(current_user.daily_mined or 0),
        "daily_cap": float(cap),
        "arbx_mining_wallet": float(current_user.arbx_mining_wallet or 0),
    }


@router.post("/claim-mining")
@limiter.limit("60/minute")
async def claim_mining(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await is_system_active("daily_work", db):
        raise HTTPException(status_code=403, detail="Daily work is currently paused (weekend/system maintenance)")
    if not await _is_mining_enabled(db):
        raise HTTPException(status_code=403, detail="Mining is currently disabled by admin")
    if (current_user.account_status or "").lower() == "on_hold":
        raise HTTPException(status_code=403, detail="Your account is on hold. Mining is disabled.")

    if not current_user.mining_active or not current_user.mining_started_at:
        raise HTTPException(status_code=400, detail="No active mining session. Start mining first.")

    now_utc = datetime.now(timezone.utc)
    cap = await _get_mining_cap(db)
    daily_mined = Decimal(str(current_user.daily_mined or 0))

    # Auto-reset if 24h cycle completed
    cycle_end = current_user.mining_started_at + timedelta(seconds=MINING_CYCLE_SECONDS)
    if now_utc >= cycle_end:
        current_user.mining_active = False
        current_user.daily_mined = Decimal("0")
        current_user.mining_started_at = None
        current_user.last_mine_time = None
        await db.commit()
        raise HTTPException(status_code=400, detail="Mining cycle ended. Start a new mining session.")

    # Check if already at cap
    remaining = cap - daily_mined
    if remaining <= 0:
        current_user.mining_active = False
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Daily cap of {cap} OFA reached. Wait for next cycle.")

    # Calculate reward based on time elapsed since last claim (or start)
    reference_time = current_user.last_mine_time or current_user.mining_started_at
    elapsed_seconds = max(0, int((now_utc - reference_time).total_seconds()))
    if elapsed_seconds < 60:
        raise HTTPException(status_code=400, detail="Wait at least 1 minute between claims.")

    per_second_rate = cap / Decimal(str(MINING_CYCLE_SECONDS))
    accrued = per_second_rate * Decimal(str(elapsed_seconds))
    reward = min(accrued, remaining).quantize(WALLET_PRECISION)

    if reward <= 0:
        raise HTTPException(status_code=400, detail="No rewards to claim yet.")

    # Credit wallet
    current_user.arbx_mining_wallet = (current_user.arbx_mining_wallet or Decimal("0")) + reward
    current_user.daily_mined = daily_mined + reward
    current_user.last_mine_time = now_utc

    # Log the claim
    db.add(MiningLog(
        user_id=current_user.id,
        amount=reward,
        mined_from=reference_time,
        mined_to=now_utc,
        daily_mined_after=current_user.daily_mined,
    ))

    await db.commit()
    await db.refresh(current_user)

    return {
        "message": "Mining reward claimed",
        "reward": float(reward),
        "daily_mined": float(current_user.daily_mined),
        "daily_cap": float(cap),
        "remaining_today": float(cap - current_user.daily_mined),
        "arbx_mining_wallet": float(current_user.arbx_mining_wallet),
        "mining_active": current_user.mining_active,
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
        .limit(500)
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
        .limit(1000)
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
        select(func.count(User.id)).where(
            and_(
                User.email_verified.is_(True),
                User.account_status == "active",
            )
        )
    )
    active_users = active_users_result.scalar() or 0

    inactive_users_result = await db.execute(
        select(func.count(User.id)).where(
            or_(
                User.email_verified.is_(False),
                User.account_status == "on_hold",
            )
        )
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

    from_balance = getattr(current_user, data.from_wallet) or Decimal("0")
    amount = Decimal(str(data.amount)).quantize(WALLET_PRECISION)

    if from_balance < amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance in {data.from_wallet}")

    setattr(current_user, data.from_wallet, (from_balance - amount).quantize(WALLET_PRECISION))
    to_balance = getattr(current_user, data.to_wallet) or Decimal("0")
    setattr(current_user, data.to_wallet, (to_balance + amount).quantize(WALLET_PRECISION))

    await db.commit()
    await db.refresh(current_user)

    return WalletTransferResponse(
        message=f"Transferred {float(amount)} from {data.from_wallet} to {data.to_wallet}",
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
    OFA_TO_USDT_RATE = Decimal("0.0001")  # 100 OFA = 0.01 USDT
    ofa_amount = Decimal(str(data.ofa_amount)).quantize(WALLET_PRECISION)
    usdt_amount = (ofa_amount * OFA_TO_USDT_RATE).quantize(WALLET_PRECISION)

    arbx_balance = current_user.arbx_wallet or Decimal("0")
    if arbx_balance < ofa_amount:
        raise HTTPException(status_code=400, detail=f"Insufficient OFA balance. You have {float(arbx_balance)} OFA")

    current_user.arbx_wallet = (arbx_balance - ofa_amount).quantize(WALLET_PRECISION)
    main_balance = current_user.main_wallet or Decimal("0")
    current_user.main_wallet = (main_balance + usdt_amount).quantize(WALLET_PRECISION)

    await db.commit()
    await db.refresh(current_user)

    return ConvertOFAResponse(
        message=f"Converted {float(ofa_amount)} OFA to {float(usdt_amount)} USDT",
        ofa_amount=float(ofa_amount),
        usdt_amount=float(usdt_amount),
        arbx_wallet_balance=float(current_user.arbx_wallet),
        main_wallet_balance=float(current_user.main_wallet),
        rate="100 OFA = 0.01 USDT",
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
    presigned_url = generate_presigned_url(object_key, expires_in=604800)  # 7 days

    current_user.profile_image_url = presigned_url
    await db.commit()

    return {
        "message": "Profile image uploaded",
        "profile_image_url": presigned_url,
    }


@router.get("/list")
async def get_user_list(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit

    total_result = await db.execute(select(func.count(User.id)))
    total = total_result.scalar() or 0

    users_result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    )
    users = users_result.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "status": "active" if u.account_status == "active" and u.email_verified else "inactive",
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }
