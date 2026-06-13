from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, case, delete, update, desc, desc

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.kyc import KYC, KYCStatus
from app.models.investments import Investment
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.deposit import Deposit
from app.models.withdrawal import Withdrawal
from app.schemas.admin import (
    UpdateKYCStatusRequest,
    CreditProfitRequest,
    UpdateWalletBalancesRequest,
    BulkTogglePackagesRequest,
)
from app.models.system_config import SystemConfig
from app.models.mining_log import MiningLog
from app.services.b2_service import generate_presigned_url
from app.utils.format_decimal import format_decimal
from app.utils.email import send_kyc_approved_email
from app.utils.is_system_active import FEATURE_CONFIG_KEYS
from app.utils.referral import apply_cascading_referral_commissions

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

WALLET_PRECISION = Decimal("0.00000000000001")
REFERRAL_LEVEL_RATES = {
    1: "10%",
    2: "8%",
    3: "7%",
    4: "6%",
    5: "5%",
}


def _resolve_effective_status(
    account_status: str | None,
    kyc_status: KYCStatus | None,
    admin_kyc_status: str | None,
) -> str:
    if (account_status or "").lower() == "on_hold":
        return "issue"
    return kyc_status.value if kyc_status else (admin_kyc_status or "pending")


@router.get("/dashboard-overview")
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    total_users_result = await db.execute(
        select(func.count(User.id))
    )
    total_users = total_users_result.scalar() or 0

    active_users_result = await db.execute(
        select(func.count(User.id)).where(User.email_verified.is_(True))
    )
    active_users = active_users_result.scalar() or 0

    pending_verifications_result = await db.execute(
        select(func.count(KYC.id)).where(KYC.status == KYCStatus.pending)
    )
    pending_verifications = pending_verifications_result.scalar() or 0

    total_invested_result = await db.execute(
        select(func.coalesce(func.sum(Investment.invested_amount), 0))
    )
    total_invested = Decimal(str(total_invested_result.scalar() or 0))

    total_profit_distributed_result = await db.execute(
        select(func.coalesce(func.sum(Investment.profit_earned), 0))
    )
    total_profit_distributed = Decimal(
        str(total_profit_distributed_result.scalar() or 0)
    )

    active_investments_result = await db.execute(
        select(func.count(Investment.id)).where(Investment.status == "active")
    )
    active_investments = active_investments_result.scalar() or 0

    completed_investments_result = await db.execute(
        select(func.count(Investment.id)).where(Investment.status == "completed")
    )
    completed_investments = completed_investments_result.scalar() or 0

    return {
        "users": {
            "total": total_users,
            "active": active_users,
        },
        "kyc": {
            "pending": pending_verifications,
        },
        "investments": {
            "active": active_investments,
            "completed": completed_investments,
            "total_invested": format_decimal(total_invested),
            "profit_distributed": format_decimal(total_profit_distributed),
        },
    }


@router.get("/user-statistics")
async def get_user_statistics(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    # Active users (email verified and account active)
    active_users_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.email_verified.is_(True),
                User.account_status == "active",
            )
        )
    )
    active_users = active_users_result.scalar() or 0

    # Inactive users (email not verified or account on hold)
    inactive_users_result = await db.execute(
        select(func.count(User.id)).where(
            or_(
                User.email_verified.is_(False),
                User.account_status == "on_hold",
            )
        )
    )
    inactive_users = inactive_users_result.scalar() or 0

    # Email verified users
    email_verified_result = await db.execute(
        select(func.count(User.id)).where(User.email_verified.is_(True))
    )
    email_verified = email_verified_result.scalar() or 0

    # Email not verified users
    email_not_verified_result = await db.execute(
        select(func.count(User.id)).where(User.email_verified.is_(False))
    )
    email_not_verified = email_not_verified_result.scalar() or 0

    # KYC Statistics
    kyc_pending_result = await db.execute(
        select(func.count(KYC.id)).where(KYC.status == KYCStatus.pending)
    )
    kyc_pending = kyc_pending_result.scalar() or 0

    kyc_approved_result = await db.execute(
        select(func.count(KYC.id)).where(KYC.status == KYCStatus.approved)
    )
    kyc_approved = kyc_approved_result.scalar() or 0

    kyc_rejected_result = await db.execute(
        select(func.count(KYC.id)).where(KYC.status == KYCStatus.rejected)
    )
    kyc_rejected = kyc_rejected_result.scalar() or 0

    # Users without KYC
    users_without_kyc_result = await db.execute(
        select(func.count(User.id)).where(
            and_(
                User.admin_kyc_status == "pending",
                User.id.not_in(select(KYC.user_id)),
            )
        )
    )
    users_without_kyc = users_without_kyc_result.scalar() or 0

    # Admin users
    admin_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_admin.is_(True))
    )
    admin_users = admin_users_result.scalar() or 0

    # Users on hold (issue status)
    on_hold_users_result = await db.execute(
        select(func.count(User.id)).where(User.account_status == "on_hold")
    )
    on_hold_users = on_hold_users_result.scalar() or 0

    # Mining users
    mining_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_mining.is_(True))
    )
    mining_users = mining_users_result.scalar() or 0

    # Users with investments
    users_with_investments_result = await db.execute(
        select(func.count(func.distinct(Investment.user_id))).where(
            Investment.status == "active"
        )
    )
    users_with_investments = users_with_investments_result.scalar() or 0

    # New users this month
    from datetime import datetime, timezone
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_users_this_month_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= start_of_month)
    )
    new_users_this_month = new_users_this_month_result.scalar() or 0

    # Users with deposits
    users_with_deposits_result = await db.execute(
        select(func.count(func.distinct(Deposit.user_id))).where(
            Deposit.status == "approved"
        )
    )
    users_with_deposits = users_with_deposits_result.scalar() or 0

    # Users with withdrawals
    users_with_withdrawals_result = await db.execute(
        select(func.count(func.distinct(Withdrawal.user_id))).where(
            Withdrawal.status == "approved"
        )
    )
    users_with_withdrawals = users_with_withdrawals_result.scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "email_verified": email_verified,
        "email_not_verified": email_not_verified,
        "kyc": {
            "pending": kyc_pending,
            "approved": kyc_approved,
            "rejected": kyc_rejected,
            "without_kyc": users_without_kyc,
        },
        "admin_users": admin_users,
        "on_hold_users": on_hold_users,
        "mining_users": mining_users,
        "users_with_investments": users_with_investments,
        "new_users_this_month": new_users_this_month,
        "users_with_deposits": users_with_deposits,
        "users_with_withdrawals": users_with_withdrawals,
    }


@router.get("/users")
async def get_admin_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1),
    search: str | None = None,
    status: str = "all",
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    # Enforce max limit 50
    if limit > 50:
        limit = 50

    offset = (page - 1) * limit

    normalized_search = (search or "").strip()
    normalized_status = (status or "all").strip().lower()

    if normalized_status not in {"all", "approved", "pending", "rejected", "issue"}:
        raise HTTPException(status_code=400, detail="Invalid status filter")

    def apply_filters(statement, include_status: bool = True):
        if normalized_search:
            statement = statement.where(
                or_(
                    User.full_name.ilike(f"%{normalized_search}%"),
                    User.username.ilike(f"%{normalized_search}%"),
                    User.email.ilike(f"%{normalized_search}%"),
                )
            )

        if include_status and normalized_status != "all":
            if normalized_status == "issue":
                statement = statement.where(User.account_status == "on_hold")
            elif normalized_status == "pending":
                # If KYC exists, KYC status is authoritative. Otherwise fallback to admin_kyc_status.
                statement = statement.where(
                    and_(
                        User.account_status != "on_hold",
                        or_(
                            KYC.status == KYCStatus.pending,
                            and_(KYC.id.is_(None), User.admin_kyc_status == "pending"),
                        ),
                    )
                )
            else:
                statement = statement.where(
                    and_(
                        User.account_status != "on_hold",
                        or_(
                            KYC.status == KYCStatus(normalized_status),
                            and_(KYC.id.is_(None), User.admin_kyc_status == normalized_status),
                        ),
                    )
                )
        return statement

    list_query = apply_filters(
        select(User, KYC.status, User.admin_kyc_status).join(
            KYC, KYC.user_id == User.id, isouter=True
        )
    ).order_by(User.updated_at.desc(), User.created_at.desc(), User.id.desc())

    total_query = apply_filters(
        select(User.id).distinct().join(KYC, KYC.user_id == User.id, isouter=True)
    )
    total_result = await db.execute(
        select(func.count()).select_from(total_query.subquery())
    )
    total = total_result.scalar() or 0

    result = await db.execute(list_query.offset(offset).limit(limit))
    rows = result.all()

    users = []
    for user, kyc_status, admin_kyc_status in rows:
        users.append({
            "id": user.id,
            "full_name": user.full_name,
            "username": user.username,
            "email": user.email,
            "status": _resolve_effective_status(
                user.account_status,
                kyc_status,
                admin_kyc_status,
            ),
            "account_status": user.account_status,
        })

    # Status counters are calculated across the current search set (ignoring status tab).
    status_counts_query = apply_filters(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (
                            and_(User.account_status != "on_hold", KYC.status == KYCStatus.approved),
                            1,
                        ),
                        (
                            and_(
                                User.account_status != "on_hold",
                                KYC.id.is_(None),
                                User.admin_kyc_status == "approved",
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("approved"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            and_(User.account_status != "on_hold", KYC.status == KYCStatus.pending),
                            1,
                        ),
                        (
                            and_(
                                User.account_status != "on_hold",
                                KYC.id.is_(None),
                                User.admin_kyc_status == "pending",
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("pending"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            and_(User.account_status != "on_hold", KYC.status == KYCStatus.rejected),
                            1,
                        ),
                        (
                            and_(
                                User.account_status != "on_hold",
                                KYC.id.is_(None),
                                User.admin_kyc_status == "rejected",
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("rejected"),
            func.coalesce(
                func.sum(
                    case(
                        (User.account_status == "on_hold", 1),
                        else_=0,
                    )
                ),
                0,
            ).label("issue"),
        ).select_from(User).join(KYC, KYC.user_id == User.id, isouter=True),
        include_status=False,
    )
    approved_count, pending_count, rejected_count, issue_count = (
        await db.execute(status_counts_query)
    ).one()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": users,
        "status_counts": {
            "approved": int(approved_count or 0),
            "pending": int(pending_count or 0),
            "rejected": int(rejected_count or 0),
            "issue": int(issue_count or 0),
        }
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    kyc_result = await db.execute(
        select(KYC).where(KYC.user_id == user.id)
    )
    kyc = kyc_result.scalar_one_or_none()

    # Referrer hierarchy
    referrer_ids = [
        user.parent_lvl_1_id,
        user.parent_lvl_2_id,
        user.parent_lvl_3_id,
        user.parent_lvl_4_id,
        user.parent_lvl_5_id,
    ]

    referrers = []
    for level, ref_id in enumerate(referrer_ids, start=1):
        if ref_id:
            ref_result = await db.execute(
                select(User).where(User.id == ref_id)
            )
            ref_user = ref_result.scalar_one_or_none()
            if ref_user:
                referrers.append({
                    "level": level,
                    "id": ref_user.id,
                    "username": ref_user.username,
                    "email": ref_user.email,
                })

    downline_result = await db.execute(
        select(User).where(
            or_(
                User.parent_lvl_1_id == user.id,
                User.parent_lvl_2_id == user.id,
                User.parent_lvl_3_id == user.id,
                User.parent_lvl_4_id == user.id,
                User.parent_lvl_5_id == user.id,
            )
        )
    )
    downline_users = downline_result.scalars().all()

    level_map = {1: [], 2: [], 3: [], 4: [], 5: []}
    level_totals = {
        1: Decimal("0"),
        2: Decimal("0"),
        3: Decimal("0"),
        4: Decimal("0"),
        5: Decimal("0"),
    }
    total_active_referrals = 0

    if downline_users:
        parent_ids = {
            member.parent_lvl_1_id
            for member in downline_users
            if member.parent_lvl_1_id
        }
        parent_usernames: dict[int, str] = {}
        if parent_ids:
            parent_result = await db.execute(
                select(User.id, User.username).where(User.id.in_(parent_ids))
            )
            parent_usernames = {
                parent_id: username
                for parent_id, username in parent_result.all()
            }

        candidate_ids = [user.id] + [member.id for member in downline_users]
        direct_counts_result = await db.execute(
            select(User.parent_lvl_1_id, func.count(User.id))
            .where(User.parent_lvl_1_id.in_(candidate_ids))
            .group_by(User.parent_lvl_1_id)
        )
        direct_counts = {
            parent_id: count
            for parent_id, count in direct_counts_result.all()
            if parent_id
        }

        downline_ids = [member.id for member in downline_users]
        active_result = await db.execute(
            select(Investment.user_id).where(
                Investment.status == "active",
                Investment.user_id.in_(downline_ids),
            )
        )
        active_user_ids = {row[0] for row in active_result.all()}

        for member in downline_users:
            level = None
            if member.parent_lvl_1_id == user.id:
                level = 1
            elif member.parent_lvl_2_id == user.id:
                level = 2
            elif member.parent_lvl_3_id == user.id:
                level = 3
            elif member.parent_lvl_4_id == user.id:
                level = 4
            elif member.parent_lvl_5_id == user.id:
                level = 5

            if not level:
                continue

            if member.email_verified:
                total_active_referrals += 1

            member_earnings = (member.referral_wallet or Decimal("0")) + (
                member.generation_wallet or Decimal("0")
            )
            level_totals[level] += member_earnings

            level_map[level].append(
                {
                    "id": member.id,
                    "name": member.full_name,
                    "username": member.username,
                    "level": level,
                    "join_date": member.created_at.strftime("%b %d, %Y"),
                    "total_earnings": format_decimal(member_earnings),
                    "referred_by": parent_usernames.get(member.parent_lvl_1_id),
                    "direct_referrals": direct_counts.get(member.id, 0),
                    "status": "active" if member.id in active_user_ids else "inactive",
                }
            )

    referral_tree_levels = []
    for level in range(1, 6):
        referral_tree_levels.append(
            {
                "level": level,
                "commission_rate": REFERRAL_LEVEL_RATES[level],
                "total_earnings": format_decimal(level_totals[level]),
                "users": level_map[level],
            }
        )

    deposits_result = await db.execute(
        select(Deposit)
        .where(Deposit.user_id == user.id)
        .order_by(Deposit.created_at.desc())
        .limit(20)
    )
    deposits = deposits_result.scalars().all()

    withdrawals_result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.user_id == user.id)
        .order_by(Withdrawal.created_at.desc())
        .limit(20)
    )
    withdrawals = withdrawals_result.scalars().all()

    active_investments_result = await db.execute(
        select(Investment)
        .where(
            Investment.user_id == user.id,
            Investment.status == "active",
        )
        .order_by(Investment.created_at.desc())
    )
    active_investments = active_investments_result.scalars().all()
    current_active_packages = [
        {
            "id": inv.id,
            "package_name": inv.package_name,
            "invested_amount": format_decimal(inv.invested_amount),
            "roi_percent": format_decimal(inv.roi_percent),
            "start_date": inv.start_date,
            "status": inv.status,
        }
        for inv in active_investments
    ]

    return {
        "id": user.id,
        "full_name": user.full_name,
        "username": user.username,
        "email": user.email,
        "email_verified": user.email_verified,
        "status": _resolve_effective_status(
            user.account_status,
            kyc.status if kyc else None,
            user.admin_kyc_status,
        ),
        "account_status": user.account_status,
        "issue_note": user.account_issue,
        "wallets": {
            "main_wallet": format_decimal(user.main_wallet),
            "deposit_wallet": format_decimal(user.deposit_wallet),
            "withdraw_wallet": format_decimal(user.withdraw_wallet),
            "referral_wallet": format_decimal(user.referral_wallet),
            "generation_wallet": format_decimal(user.generation_wallet),
            "arbx_wallet": format_decimal(user.arbx_wallet),
            "arbx_mining_wallet": format_decimal(user.arbx_mining_wallet),
        },
        "kyc": {
            "country": kyc.country if kyc else None,
            "phone_number": kyc.phone_number if kyc else None,
            "document_type": kyc.document_type.value if kyc else None,
            "document_number": kyc.document_number if kyc else None,
            "status": kyc.status.value if kyc else None,
            "front_image_url": generate_presigned_url(kyc.front_image_key) if kyc else None,
            "back_image_url": generate_presigned_url(kyc.back_image_key) if kyc else None,
        } if kyc else None,
        "referrers": referrers,
        "referral_tree": {
            "total_referrals": len(downline_users),
            "total_active_referrals": total_active_referrals,
            "levels": referral_tree_levels,
        },
        "current_active_package": current_active_packages[0] if current_active_packages else None,
        "current_active_packages": current_active_packages,
        "deposit_history": [
            {
                "id": dep.id,
                "network_name": dep.network_name,
                "amount": format_decimal(dep.amount),
                "txid": dep.txid,
                "status": dep.status,
                "created_at": dep.created_at,
            }
            for dep in deposits
        ],
        "withdrawal_history": [
            {
                "id": w.id,
                "source_wallet": w.source_wallet,
                "network_name": w.network_name,
                "amount": format_decimal(w.amount),
                "destination_address": w.destination_address,
                "status": w.status,
                "created_at": w.created_at,
            }
            for w in withdrawals
        ],
    }


@router.patch("/users/{user_id}/kyc-status")
async def update_kyc_status(
    user_id: int,
    payload: UpdateKYCStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin

    requested_status = (payload.status or "").strip().lower()
    if requested_status not in {"pending", "approved", "rejected", "issue"}:
        raise HTTPException(status_code=400, detail="Invalid KYC status")

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(select(KYC).where(KYC.user_id == user_id))
    kyc = result.scalar_one_or_none()
    previous_status = kyc.status if kyc else None

    if requested_status == "issue":
        issue_note = (payload.issue_note or "").strip()
        if not issue_note:
            raise HTTPException(
                status_code=400,
                detail="Issue note is required when status is issue",
            )
        user.account_status = "on_hold"
        user.account_issue = issue_note
        await db.commit()
        await db.refresh(user)
        return {
            "message": "User status updated successfully",
            "new_status": "issue",
            "issue_note": user.account_issue,
            "account_status": user.account_status,
        }

    new_kyc_status = KYCStatus(requested_status)

    if kyc:
        kyc.status = new_kyc_status

    # Always persist an admin status so users without KYC can still be managed.
    user.admin_kyc_status = new_kyc_status.value
    user.account_status = "active"
    user.account_issue = None
    await db.commit()
    await db.refresh(user)
    if kyc:
        await db.refresh(kyc)

    if (
        kyc
        and new_kyc_status == KYCStatus.approved
        and previous_status != KYCStatus.approved
    ):
        await send_kyc_approved_email(user_id)

    return {
        "message": "User status updated successfully",
        "new_status": new_kyc_status.value,
        "issue_note": None,
        "account_status": user.account_status,
    }


@router.patch("/users/{user_id}/wallets")
async def update_user_wallets(
    user_id: int,
    payload: UpdateWalletBalancesRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_fields = payload.model_dump(exclude_none=True)

    if not update_fields:
        raise HTTPException(status_code=400, detail="No wallet balances provided")

    for field, raw_value in update_fields.items():
        value = Decimal(str(raw_value)).quantize(
            WALLET_PRECISION,
            rounding=ROUND_HALF_UP,
        )
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return {
        "message": "Wallet balances updated successfully",
        "wallets": {
            "main_wallet": format_decimal(user.main_wallet),
            "deposit_wallet": format_decimal(user.deposit_wallet),
            "withdraw_wallet": format_decimal(user.withdraw_wallet),
            "referral_wallet": format_decimal(user.referral_wallet),
            "generation_wallet": format_decimal(user.generation_wallet),
            "arbx_wallet": format_decimal(user.arbx_wallet),
            "arbx_mining_wallet": format_decimal(user.arbx_mining_wallet),
        },
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_admin:
        raise HTTPException(status_code=400, detail="Admin user cannot be deleted")

    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    investments_result = await db.execute(
        select(Investment.id).where(Investment.user_id == user_id)
    )
    investment_ids = [row[0] for row in investments_result.all()]

    if investment_ids:
        await db.execute(
            delete(InvestmentProfitHistory).where(
                InvestmentProfitHistory.investment_id.in_(investment_ids)
            )
        )

    await db.execute(
        update(Withdrawal)
        .where(Withdrawal.approved_by == user_id)
        .values(approved_by=None)
    )
    await db.execute(delete(Deposit).where(Deposit.user_id == user_id))
    await db.execute(delete(Withdrawal).where(Withdrawal.user_id == user_id))
    await db.execute(
        delete(ReferralProfitHistory).where(
            or_(
                ReferralProfitHistory.source_user_id == user_id,
                ReferralProfitHistory.receiver_user_id == user_id,
            )
        )
    )
    if investment_ids:
        await db.execute(delete(Investment).where(Investment.id.in_(investment_ids)))

    await db.execute(delete(KYC).where(KYC.user_id == user_id))

    await db.execute(
        update(User)
        .where(User.parent_lvl_1_id == user_id)
        .values(parent_lvl_1_id=None)
    )
    await db.execute(
        update(User)
        .where(User.parent_lvl_2_id == user_id)
        .values(parent_lvl_2_id=None)
    )
    await db.execute(
        update(User)
        .where(User.parent_lvl_3_id == user_id)
        .values(parent_lvl_3_id=None)
    )
    await db.execute(
        update(User)
        .where(User.parent_lvl_4_id == user_id)
        .values(parent_lvl_4_id=None)
    )
    await db.execute(
        update(User)
        .where(User.parent_lvl_5_id == user_id)
        .values(parent_lvl_5_id=None)
    )

    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()

    return {"message": "User deleted successfully"}


@router.post("/users/{user_id}/credit-profit")
async def credit_user_profit(
    user_id: int,
    payload: CreditProfitRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profit_amount = Decimal(str(payload.profit_amount)).quantize(
        WALLET_PRECISION,
        rounding=ROUND_HALF_UP,
    )

    user.main_wallet = (user.main_wallet + profit_amount).quantize(
        WALLET_PRECISION,
        rounding=ROUND_HALF_UP,
    )

    distributions = await apply_cascading_referral_commissions(
        db=db,
        user=user,
        base_profit=profit_amount,
    )

    await db.commit()
    await db.refresh(user)

    return {
        "message": "Profit credited and cascading referral distribution applied",
        "user_id": user.id,
        "profit_amount": format_decimal(profit_amount),
        "updated_wallets": {
            "main_wallet": format_decimal(user.main_wallet),
            "referral_wallet": format_decimal(user.referral_wallet),
            "generation_wallet": format_decimal(user.generation_wallet),
        },
        "referral_distributions": [
            {
                "level": item["level"],
                "user_id": item["user_id"],
                "wallet": item["wallet"],
                "amount": format_decimal(item["amount"]),
            }
            for item in distributions
        ],
    }


@router.get("/system-config")
async def get_system_config(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    configs = {}
    for key in FEATURE_CONFIG_KEYS.values():
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == key)
        )
        row = result.scalar_one_or_none()
        configs[key] = row.value if row else None
    return {"data": configs}


@router.put("/system-config/{key}")
async def update_system_config(
    key: str,
    value: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    if key not in FEATURE_CONFIG_KEYS.values():
        raise HTTPException(status_code=400, detail="Invalid config key")
    if value.lower() not in ("true", "false"):
        raise HTTPException(status_code=400, detail="Value must be 'true' or 'false'")
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == key)
    )
    config = result.scalar_one_or_none()
    if not config:
        config = SystemConfig(key=key, value=value.lower())
        db.add(config)
    else:
        config.value = value.lower()
    await db.commit()
    await db.refresh(config)
    logger = __import__("logging").getLogger(__name__)
    logger.info("Admin set system config %s=%s", key, value.lower())
    return {"message": f"{key} set to {value.lower()}"}


@router.get("/mining/config")
async def get_mining_config(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    config = {}
    for key in ("mining_enabled", "mining_daily_cap"):
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        row = result.scalar_one_or_none()
        config[key] = row.value if row else None
    return {"data": config}


@router.put("/mining/config/{key}")
async def update_mining_config(
    key: str,
    value: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    if key not in ("mining_enabled", "mining_daily_cap"):
        raise HTTPException(status_code=400, detail="Invalid mining config key")
    if key == "mining_enabled" and value.lower() not in ("true", "false"):
        raise HTTPException(status_code=400, detail="mining_enabled must be 'true' or 'false'")
    if key == "mining_daily_cap":
        try:
            cap = Decimal(value)
            if cap <= 0 or cap > 10000:
                raise HTTPException(status_code=400, detail="Cap must be between 0 and 10000")
        except Exception:
            raise HTTPException(status_code=400, detail="mining_daily_cap must be a number")
    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    if not config:
        config = SystemConfig(key=key, value=value.lower() if key == "mining_enabled" else value)
        db.add(config)
    else:
        config.value = value.lower() if key == "mining_enabled" else value
    await db.commit()
    import logging
    logging.getLogger(__name__).info("Admin set mining config %s=%s", key, config.value)
    return {"message": f"{key} set to {config.value}"}


@router.get("/mining/stats")
async def get_mining_stats(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    offset = (page - 1) * limit

    total_result = await db.execute(
        select(func.count(User.id)).where(User.mining_active.is_(True))
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(User)
        .where(User.mining_active.is_(True))
        .order_by(User.daily_mined.desc())
        .offset(offset)
        .limit(limit)
    )
    users = result.scalars().all()

    return {
        "total_active_miners": total,
        "page": page,
        "limit": limit,
        "data": [
            {
                "user_id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "mining_active": u.mining_active,
                "daily_mined": float(u.daily_mined or 0),
                "arbx_mining_wallet": float(u.arbx_mining_wallet or 0),
                "mining_started_at": u.mining_started_at.isoformat() if u.mining_started_at else None,
                "last_mine_time": u.last_mine_time.isoformat() if u.last_mine_time else None,
            }
            for u in users
        ],
    }


# ── Package Management ──────────────────────────────────────────────────

@router.get("/packages")
async def admin_list_packages(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package
    result = await db.execute(select(Package).order_by(Package.investment_amount.asc()))
    packages = result.scalars().all()
    return {
        "packages": [
            {
                "id": p.id,
                "name": p.name,
                "investment_amount": float(p.investment_amount),
                "total_return": float(p.total_return),
                "daily_payment": float(p.daily_payment),
                "duration_days": p.duration_days,
                "captcha_required_per_day": p.captcha_required_per_day,
                "captcha_task_duration_seconds": p.captcha_task_duration_seconds,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in packages
        ]
    }


@router.put("/packages/{package_id}")
async def admin_update_package(
    package_id: int,
    name: str | None = None,
    investment_amount: float | None = None,
    total_return: float | None = None,
    daily_payment: float | None = None,
    duration_days: int | None = None,
    captcha_required_per_day: int | None = None,
    captcha_task_duration_seconds: int | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(404, "Package not found")

    if name is not None:
        package.name = name
    if investment_amount is not None:
        package.investment_amount = Decimal(str(investment_amount))
    if total_return is not None:
        package.total_return = Decimal(str(total_return))
    if daily_payment is not None:
        package.daily_payment = Decimal(str(daily_payment))
    if duration_days is not None:
        package.duration_days = duration_days
    if captcha_required_per_day is not None:
        package.captcha_required_per_day = captcha_required_per_day
    if captcha_task_duration_seconds is not None:
        package.captcha_task_duration_seconds = captcha_task_duration_seconds
    if is_active is not None:
        package.is_active = is_active

    await db.commit()
    return {"status": "updated", "package_id": package.id}


@router.patch("/packages/{package_id}/toggle")
async def admin_toggle_package(
    package_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(404, "Package not found")

    package.is_active = not package.is_active
    await db.commit()
    return {"status": "updated", "is_active": package.is_active}


@router.get("/packages/{package_id}/subscribers")
async def admin_package_subscribers(
    package_id: int,
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(404, "Package not found")

    PAGE_SIZE = 50
    offset = (page - 1) * PAGE_SIZE

    count_result = await db.execute(
        select(func.count(Investment.id)).where(Investment.package_name == package.name)
    )
    total = count_result.scalar() or 0

    query = (
        select(Investment, User)
        .join(User, User.id == Investment.user_id)
        .where(Investment.package_name == package.name)
        .order_by(Investment.created_at.desc())
        .offset(offset)
        .limit(PAGE_SIZE)
    )
    rows = (await db.execute(query)).all()

    return {
        "package_name": package.name,
        "total_subscribers": total,
        "page": page,
        "page_size": PAGE_SIZE,
        "total_pages": (total + PAGE_SIZE - 1) // PAGE_SIZE,
        "subscribers": [
            {
                "investment_id": inv.id,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "invested_amount": float(inv.invested_amount),
                "daily_payment": float(inv.daily_payment or 0),
                "profit_earned": float(inv.profit_earned),
                "expected_profit": float(inv.expected_profit),
                "start_date": inv.start_date.isoformat() if inv.start_date else None,
                "status": inv.status,
            }
            for inv, user in rows
        ],
    }


@router.post("/packages")
async def admin_create_package(
    name: str,
    investment_amount: float,
    total_return: float,
    daily_payment: float,
    duration_days: int = 365,
    captcha_required_per_day: int = 12,
    captcha_task_duration_seconds: int = 30,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package

    result = await db.execute(select(Package).where(Package.name == name))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Package with this name already exists")

    package = Package(
        name=name,
        investment_amount=Decimal(str(investment_amount)),
        total_return=Decimal(str(total_return)),
        daily_payment=Decimal(str(daily_payment)),
        duration_days=duration_days,
        captcha_required_per_day=captcha_required_per_day,
        captcha_task_duration_seconds=captcha_task_duration_seconds,
        is_active=is_active,
    )
    db.add(package)
    await db.commit()
    await db.refresh(package)
    return {"status": "created", "package_id": package.id, "name": package.name}


@router.delete("/packages/{package_id}")
async def admin_delete_package(
    package_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(404, "Package not found")

    count_result = await db.execute(
        select(func.count(Investment.id)).where(
            Investment.package_name == package.name,
            Investment.status.in_(["active", "completed"])
        )
    )
    active_count = count_result.scalar() or 0
    if active_count > 0:
        raise HTTPException(
            400,
            f"Cannot delete package with {active_count} active/completed investments. "
            "Deactivate it instead."
        )

    await db.delete(package)
    await db.commit()
    return {"status": "deleted", "package_id": package_id}


@router.get("/packages/stats")
async def admin_package_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package

    result = await db.execute(select(Package).order_by(Package.investment_amount.asc()))
    packages = result.scalars().all()

    stats = []
    for p in packages:
        inv_result = await db.execute(
            select(
                func.count(Investment.id).label("total_investors"),
                func.coalesce(func.sum(Investment.invested_amount), 0).label("total_invested"),
                func.coalesce(func.sum(Investment.profit_earned), 0).label("total_profit_paid"),
                func.coalesce(
                    func.sum(case((Investment.status == "active", 1), else_=0)), 0
                ).label("active_count"),
            ).where(Investment.package_name == p.name)
        )
        row = inv_result.one()

        stats.append({
            "id": p.id,
            "name": p.name,
            "investment_amount": float(p.investment_amount),
            "total_return": float(p.total_return),
            "daily_payment": float(p.daily_payment),
            "is_active": p.is_active,
            "total_investors": row.total_investors,
            "total_invested": float(row.total_invested),
            "total_profit_paid": float(row.total_profit_paid),
            "active_investors": row.active_count,
        })

    return {"packages": stats}


@router.patch("/packages/bulk-toggle")
async def admin_bulk_toggle_packages(
    body: BulkTogglePackagesRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package

    result = await db.execute(
        select(Package).where(Package.id.in_(body.package_ids))
    )
    packages = result.scalars().all()

    if len(packages) != len(body.package_ids):
        raise HTTPException(404, "Some packages not found")

    for p in packages:
        p.is_active = body.is_active

    await db.commit()
    return {
        "status": "updated",
        "updated_count": len(packages),
        "is_active": body.is_active,
    }

