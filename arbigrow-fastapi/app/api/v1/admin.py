import logging
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, case, delete, update, desc, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.kyc import KYC, KYCStatus, KycPackage, PaymentStatus
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, WalletTransactionStatus
from app.models.company_wallet import CompanyWallet
from app.models.investments import Investment
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.deposit import Deposit
from app.models.withdrawal import Withdrawal
from app.models.transfer_log import TransferLog
from app.models.matching_bonus import MatchingBonus
from app.models.mining_log import MiningLog
from app.models.captcha import CaptchaEarning, CaptchaChallenge
from app.models.ad_view import AdView
from app.models.user_ad_view import UserAdView
from app.models.invoice import Invoice
from app.models.notification import AdminNotification
from app.models.order import Order, OrderItem
from app.models.seller import Seller
from app.models.announcement import Announcement
from app.schemas.admin import (
    UpdateKYCStatusRequest,
    CreditProfitRequest,
    UpdateWalletBalancesRequest,
    BulkTogglePackagesRequest,
    ConfigUpdate,
)
from app.models.system_config import SystemConfig
from app.models.mining_log import MiningLog
from app.models.visitor_log import VisitorLog
from app.services.b2_service import generate_presigned_url


def _resolve_image_url(stored: str | None) -> str | None:
    if not stored:
        return None
    if stored.startswith("http"):
        return stored
    return generate_presigned_url(stored)
from app.utils.format_decimal import format_decimal
from app.utils.is_system_active import FEATURE_CONFIG_KEYS
from app.core.referral import get_referral_level_rates
from app.utils.referral import apply_cascading_referral_commissions
from app.utils.notifications import notify_admin

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)

WALLET_PRECISION = Decimal("0.00000000000001")


def _resolve_effective_status(
    account_status: str | None,
    kyc_status: KYCStatus | None,
    admin_kyc_status: str | None,
    email_verified: bool = True,
) -> str:
    if (account_status or "").lower() == "on_hold":
        return "issue"
    if admin_kyc_status and admin_kyc_status != "pending":
        return admin_kyc_status
    if kyc_status:
        return kyc_status.value
    if (account_status or "").lower() != "active" or not email_verified:
        return "not_submitted"
    return "not_submitted"


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
        select(func.count(User.id)).where(User.mining_active.is_(True))
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
    has_kyc: bool = False,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    # Enforce max limit 50
    if limit > 50:
        limit = 50

    offset = (page - 1) * limit

    normalized_search = (search or "").strip()
    normalized_status = (status or "all").strip().lower()

    if normalized_status not in {"all", "approved", "pending", "rejected", "issue", "inactive", "not_submitted"}:
        raise HTTPException(status_code=400, detail="Invalid status filter")

    def apply_filters(statement, include_status: bool = True):
        if has_kyc:
            statement = statement.where(KYC.id.isnot(None))

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
            elif normalized_status == "inactive":
                statement = statement.where(
                    or_(
                        User.account_status != "active",
                        User.email_verified.is_(False),
                    )
                )
            elif has_kyc:
                if normalized_status == "pending":
                    statement = statement.where(
                        and_(
                            User.account_status != "on_hold",
                            KYC.status == KYCStatus.pending,
                        )
                    )
                else:
                    statement = statement.where(
                        and_(
                            User.account_status != "on_hold",
                            KYC.status == KYCStatus(normalized_status),
                        )
                    )
            elif normalized_status == "pending":
                # Only users with an actual KYC row pending review
                statement = statement.where(
                    and_(
                        User.account_status != "on_hold",
                        KYC.status == KYCStatus.pending,
                    )
                )
            elif normalized_status == "not_submitted":
                statement = statement.where(
                    and_(
                        User.account_status == "active",
                        User.email_verified.is_(True),
                        KYC.id.is_(None),
                        User.admin_kyc_status == "pending",
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
        select(User, KYC.status, KYC.transaction_id, KYC.created_at, KYC.kyc_package_id, User.admin_kyc_status).join(
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
    for user, kyc_status, kyc_txn_id, kyc_created_at, kyc_package_id, admin_kyc_status in rows:
        users.append({
            "id": user.id,
            "user_no": user.user_no,
            "full_name": user.full_name,
            "username": user.username,
            "email": user.email,
            "email_verified": user.email_verified,
            "has_kyc_submitted": kyc_status is not None,
            "kyc_transaction_id": kyc_txn_id,
            "kyc_created_at": kyc_created_at.isoformat() if kyc_created_at else None,
            "kyc_package_id": kyc_package_id,
            "status": _resolve_effective_status(
                user.account_status,
                kyc_status,
                admin_kyc_status,
                user.email_verified,
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
                            and_(
                                User.account_status != "on_hold",
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
                            and_(
                                User.account_status != "on_hold",
                                KYC.status == KYCStatus.pending,
                                User.admin_kyc_status != "approved",
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
                        (
                            and_(
                                User.account_status == "active",
                                User.email_verified.is_(True),
                                KYC.id.is_(None),
                                User.admin_kyc_status == "pending",
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("not_submitted"),
            func.coalesce(
                func.sum(
                    case(
                        (User.account_status == "on_hold", 1),
                        else_=0,
                    )
                ),
                0,
            ).label("issue"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            or_(
                                User.account_status != "active",
                                User.email_verified.is_(False),
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("inactive"),
        ).select_from(User).join(KYC, KYC.user_id == User.id, isouter=True),
        include_status=False,
    )
    approved_count, pending_count, rejected_count, not_submitted_count, issue_count, inactive_count = (
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
            "not_submitted": int(not_submitted_count or 0),
            "issue": int(issue_count or 0),
            "inactive": int(inactive_count or 0),
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
        select(KYC).options(selectinload(KYC.package)).where(KYC.user_id == user.id)
    )
    kyc = kyc_result.scalar_one_or_none()

    rates = await get_referral_level_rates(db)
    display_rates = {lvl: f"{int(r)}%" if r == int(r) else f"{r}%" for lvl, r in rates.items()}

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
                    "user_no": ref_user.user_no,
                    "username": ref_user.username,
                    "email": ref_user.email,
                })

    from sqlalchemy import text

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
    team_rows = await db.execute(team_stmt, {"user_id": user.id, "max_depth": 999})
    team_data = team_rows.fetchall()

    bonus_eligible_ids = {row[0] for row in team_data if row[1] <= 5}
    non_bonus_ids = {row[0] for row in team_data if row[1] > 5}

    downline_users_result = await db.execute(
        select(User).where(User.id.in_([row[0] for row in team_data]))
    )
    downline_users = downline_users_result.scalars().all()

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
                    "user_no": member.user_no,
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
                "commission_rate": display_rates[level],
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

    # Total earned from captcha
    captcha_total_result = await db.execute(
        select(func.coalesce(func.sum(CaptchaEarning.amount_earned), 0))
        .where(CaptchaEarning.user_id == user.id, CaptchaEarning.is_correct == True)
    )
    total_captcha_earned = captcha_total_result.scalar()

    # Total earned from ad views
    ad_total_result = await db.execute(
        select(func.coalesce(func.sum(AdView.amount_earned), 0))
        .where(AdView.user_id == user.id, AdView.is_completed == True)
    )
    total_ad_view_earned = ad_total_result.scalar()

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
        "user_no": user.user_no,
        "full_name": user.full_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "date_of_birth": str(user.date_of_birth) if user.date_of_birth else None,
        "gender": user.gender,
        "nationality": user.nationality,
        "country_of_residence": user.country_of_residence,
        "mobile_number": user.mobile_number,
        "residential_address": user.residential_address,
        "city": user.city,
        "state_province": user.state_province,
        "postal_code": user.postal_code,
        "national_id_number": user.national_id_number,
        "passport_number": user.passport_number,
        "religion": user.religion,
        "marital_status": user.marital_status,
        "username": user.username,
        "email": user.email,
        "email_verified": user.email_verified,
        "has_kyc_submitted": kyc is not None,
        "status": _resolve_effective_status(
            user.account_status,
            kyc.status if kyc else None,
            user.admin_kyc_status,
            user.email_verified,
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
            "captcha_wallet": format_decimal(user.captcha_wallet),
            "ad_view_wallet": format_decimal(user.ad_view_wallet),
            "ecommerce_wallet": format_decimal(user.ecommerce_wallet),
            "matching_bonus_wallet": format_decimal(user.matching_bonus_wallet),
        },
        "kyc": {
            "full_name": kyc.full_name if kyc else None,
            "country": kyc.country if kyc else None,
            "phone_number": kyc.phone_number if kyc else None,
            "document_type": kyc.document_type.value if kyc else None,
            "document_number": kyc.document_number if kyc else None,
            "status": kyc.status.value if kyc else None,
            "transaction_id": kyc.transaction_id if kyc else None,
            "created_at": kyc.created_at.isoformat() if kyc and kyc.created_at else None,
            "admin_note": kyc.admin_note if kyc else None,
            "payment_status": kyc.payment_status.value if kyc else None,
            "kyc_package": {
                "id": kyc.package.id,
                "name": kyc.package.name,
                "price": str(kyc.package.price),
            } if kyc and kyc.package else None,
            "front_image_url": _resolve_image_url(kyc.front_image_key) if kyc else None,
            "back_image_url": _resolve_image_url(kyc.back_image_key) if kyc else None,
        } if kyc else None,
        "referrers": referrers,
        "referral_tree": {
            "total_team_members": len(team_data),
            "total_referrals": len(downline_users),
            "total_active_referrals": total_active_referrals,
            "bonus_eligible_members": len(bonus_eligible_ids),
            "non_bonus_members": len(non_bonus_ids),
            "levels": referral_tree_levels,
        },
        "current_active_package": current_active_packages[0] if current_active_packages else None,
        "current_active_packages": current_active_packages,
        "total_captcha_earned": format_decimal(total_captcha_earned),
        "total_ad_view_earned": format_decimal(total_ad_view_earned),
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
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin

    requested_status = (payload.status or "").strip().lower()
    if requested_status not in {"pending", "approved", "rejected", "issue"}:
        raise HTTPException(status_code=400, detail="Invalid KYC status")

    user_result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(KYC).where(KYC.user_id == user_id).with_for_update()
    )
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

        # Refund hold on issue
        hold_amount = user.kyc_hold or Decimal("0")
        refunded = Decimal("0")
        refund_txn = None
        refunded_at = None
        if hold_amount > 0:
            user.kyc_hold = Decimal("0")
            user.deposit_wallet = ((user.deposit_wallet or Decimal("0")) + hold_amount).quantize(
                WALLET_PRECISION, rounding=ROUND_HALF_UP
            )
            if kyc:
                kyc.payment_status = PaymentStatus.refunded
                kyc.fee_refunded = True
                kyc.fee_refunded_at = datetime.now(timezone.utc)
                refunded_at = kyc.fee_refunded_at
            else:
                refunded_at = datetime.now(timezone.utc)
            wallet_txn = WalletTransaction(
                user_id=user_id,
                type=WalletTransactionType.kyc_fee_refund,
                wallet_type="kyc_hold",
                amount=hold_amount,
                balance_before=hold_amount,
                balance_after=Decimal("0"),
                reference_type="kyc",
                reference_id=kyc.id if kyc else None,
                description="KYC Rejected - Fee Refunded",
                status=WalletTransactionStatus.refunded,
            )
            db.add(wallet_txn)
            refunded = hold_amount
            refund_txn = wallet_txn

        await db.commit()
        await db.refresh(user)

        message = f"User {user.full_name} ({user.email}) was flagged as issue. Note: {issue_note}"
        notif_metadata = None
        if refunded > 0 and refund_txn is not None:
            ts = refunded_at or datetime.now(timezone.utc)
            message += (
                f" Refund of ${float(refunded):.2f} credited to Deposit Wallet"
                f" (Ref #{refund_txn.id}) at {ts.strftime('%Y-%m-%d %H:%M:%S')} UTC."
            )
            notif_metadata = {
                "refund_amount": str(refunded),
                "refund_wallet": "deposit_wallet",
                "refund_wallet_label": "Deposit Wallet",
                "refund_txn_id": refund_txn.id,
                "refund_kyc_id": kyc.id if kyc else None,
                "refunded_at": ts.isoformat(),
            }

        await notify_admin(
            db=db, type="kyc_rejected",
            message=message,
            user_id=user.id, request=request,
            metadata_dict=notif_metadata,
        )

        return {
            "message": "User status updated successfully",
            "new_status": "issue",
            "issue_note": user.account_issue,
            "account_status": user.account_status,
        }

    new_kyc_status = KYCStatus(requested_status)

    if kyc:
        kyc.status = new_kyc_status
        if payload.admin_note:
            kyc.admin_note = payload.admin_note.strip()

    # Always persist an admin status so users without KYC can still be managed.
    user.admin_kyc_status = new_kyc_status.value
    user.account_status = "active" if new_kyc_status == KYCStatus.approved else "inactive"
    user.account_issue = None
    was_approved = new_kyc_status == KYCStatus.approved
    was_rejected = new_kyc_status in (KYCStatus.rejected,)
    was_reset = new_kyc_status == KYCStatus.pending and previous_status and previous_status.value != "pending"

    # Handle KYC hold: release on approve, refund on reject/reset
    hold_amount = user.kyc_hold or Decimal("0")
    refunded = Decimal("0")
    refund_txn = None
    refunded_at = None
    if hold_amount > 0:
        if was_approved:
            # Release hold to company wallet
            user.kyc_hold = Decimal("0")
            company = await db.execute(select(CompanyWallet).limit(1))
            company_wallet = company.scalar_one_or_none()
            if not company_wallet:
                company_wallet = CompanyWallet(total_kyc_collected=Decimal("0"))
                db.add(company_wallet)
            company_wallet.total_kyc_collected = (company_wallet.total_kyc_collected + hold_amount).quantize(
                WALLET_PRECISION, rounding=ROUND_HALF_UP
            )
            if kyc:
                kyc.payment_status = PaymentStatus.paid
            wallet_txn = WalletTransaction(
                user_id=user_id,
                type=WalletTransactionType.kyc_fee_release,
                wallet_type="kyc_hold",
                amount=hold_amount,
                balance_before=hold_amount,
                balance_after=Decimal("0"),
                reference_type="kyc",
                reference_id=kyc.id if kyc else None,
                description="KYC Approved - Hold Released",
                status=WalletTransactionStatus.completed,
            )
            db.add(wallet_txn)
        elif was_rejected or was_reset:
            # Refund hold back to user deposit wallet
            user.kyc_hold = Decimal("0")
            user.deposit_wallet = ((user.deposit_wallet or Decimal("0")) + hold_amount).quantize(
                WALLET_PRECISION, rounding=ROUND_HALF_UP
            )
            if kyc:
                kyc.payment_status = PaymentStatus.refunded
                kyc.fee_refunded = True
                kyc.fee_refunded_at = datetime.now(timezone.utc)
            txn_type = WalletTransactionType.kyc_fee_reset_refund if was_reset else WalletTransactionType.kyc_fee_refund
            desc = "KYC Reset - Amount Returned to Wallet" if was_reset else "KYC Rejected - Fee Refunded"
            wallet_txn = WalletTransaction(
                user_id=user_id,
                type=txn_type,
                wallet_type="kyc_hold",
                amount=hold_amount,
                balance_before=hold_amount,
                balance_after=Decimal("0"),
                reference_type="kyc",
                reference_id=kyc.id if kyc else None,
                description=desc,
                status=WalletTransactionStatus.refunded,
            )
            db.add(wallet_txn)
            refunded = hold_amount
            refund_txn = wallet_txn
            refunded_at = kyc.fee_refunded_at if (kyc and kyc.fee_refunded_at) else datetime.now(timezone.utc)

    # KYC Snapshot: capture lifetime team volume on first approval
    if was_approved and not user.kyc_approved_team_volume:
        from app.services.rank_service import get_team_volume
        _total_personal, total_team = await get_team_volume(user.id, db)
        user.kyc_approved_team_volume = total_team

    if was_approved and not user.kyc_approved_at:
        user.kyc_approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    if kyc:
        await db.refresh(kyc)

    # Trigger rank evaluation for newly KYC-approved user
    if was_approved:
        try:
            from app.services.rank_service import evaluate_and_process_rank
            await evaluate_and_process_rank(
                user_id=user.id,
                db=db,
                source_user_id=user.id,
                skip_bonus=False,
                use_snapshot_volume=True,
                snapshot_volume=user.kyc_approved_team_volume,
                reference_id=kyc.id if kyc else None,
                reference_type="kyc",
            )
            # Also trigger rank evaluation for ALL ancestors
            next_id = user.parent_lvl_1_id
            while next_id:
                await evaluate_and_process_rank(
                    user_id=next_id,
                    db=db,
                    source_user_id=user.id,
                    skip_bonus=True,
                    reference_id=kyc.id if kyc else None,
                    reference_type="kyc",
                )
                par = await db.get(User, next_id)
                next_id = par.parent_lvl_1_id if par else None
            await db.commit()
        except Exception:
            logger.warning("Rank evaluation failed for user_id=%s during KYC approval (non-blocking)", user_id, exc_info=True)
    elif was_rejected or was_reset:
        # KYC gate: a rejected/reset user must never keep any rank entitlement.
        # Strip current rank, team volume, matching bonuses, and rank history.
        try:
            from app.services.rank_service import enforce_kyc_rank_gate
            await enforce_kyc_rank_gate(user, db)
            await db.commit()
            await db.refresh(user)
        except Exception:
            logger.warning("KYC rank enforcement failed for user_id=%s (non-blocking)", user_id, exc_info=True)

    notif_type = "kyc_approved" if was_approved else "kyc_rejected"

    message = f"User #{user_id} KYC was {new_kyc_status.value} by admin"
    notif_metadata = None
    if (was_rejected or was_reset) and refunded > 0:
        ts = refunded_at or datetime.now(timezone.utc)
        message = (
            f"User #{user_id} KYC was {new_kyc_status.value} by admin. "
            f"Refund of ${float(refunded):.2f} credited to Deposit Wallet"
            f" (Ref #{refund_txn.id if refund_txn else 'N/A'}) at "
            f"{ts.strftime('%Y-%m-%d %H:%M:%S')} UTC."
        )
        notif_metadata = {
            "refund_amount": str(refunded),
            "refund_wallet": "deposit_wallet",
            "refund_wallet_label": "Deposit Wallet",
            "refund_txn_id": refund_txn.id if refund_txn else None,
            "refund_kyc_id": kyc.id if kyc else None,
            "refunded_at": ts.isoformat(),
        }

    await notify_admin(
        db=db, type=notif_type,
        message=message,
        user_id=user_id, request=request,
        metadata_dict=notif_metadata,
    )

    return {
        "message": "User status updated successfully",
        "new_status": new_kyc_status.value,
        "issue_note": None,
        "account_status": user.account_status,
        "admin_note": (kyc.admin_note if kyc else None),
    }


@router.patch("/users/{user_id}/wallets")
async def update_user_wallets(
    user_id: int,
    payload: UpdateWalletBalancesRequest,
    request: Request,
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

    ALLOWED_WALLET_FIELDS = {
        "main_wallet", "deposit_wallet", "withdraw_wallet",
        "referral_wallet", "generation_wallet", "arbx_wallet",
        "arbx_mining_wallet", "captcha_wallet", "ad_view_wallet",
        "ecommerce_wallet", "matching_bonus_wallet",
    }

    for field, raw_value in update_fields.items():
        if field not in ALLOWED_WALLET_FIELDS:
            raise HTTPException(status_code=400, detail=f"Field '{field}' is not a valid wallet field")
        value = Decimal(str(raw_value)).quantize(
            WALLET_PRECISION,
            rounding=ROUND_HALF_UP,
        )
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    await notify_admin(
        db=db, type="wallet_updated",
        message=f"Admin updated wallets for user #{user_id}: {', '.join(update_fields.keys())}",
        user_id=user_id, request=request,
    )

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
            "captcha_wallet": format_decimal(user.captcha_wallet),
            "ad_view_wallet": format_decimal(user.ad_view_wallet),
            "matching_bonus_wallet": format_decimal(user.matching_bonus_wallet),
        },
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
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
    await db.execute(delete(TransferLog).where(TransferLog.sender_id == user_id))
    await db.execute(delete(TransferLog).where(TransferLog.receiver_id == user_id))
    await db.execute(delete(MiningLog).where(MiningLog.user_id == user_id))
    await db.execute(delete(CaptchaEarning).where(CaptchaEarning.user_id == user_id))
    from app.models.captcha import CaptchaChallenge
    await db.execute(delete(CaptchaChallenge).where(CaptchaChallenge.user_id == user_id))
    await db.execute(delete(AdView).where(AdView.user_id == user_id))
    from app.models.user_ad_view import UserAdView
    await db.execute(delete(UserAdView).where(UserAdView.user_id == user_id))
    await db.execute(delete(Invoice).where(Invoice.user_id == user_id))
    await db.execute(delete(AdminNotification).where(AdminNotification.user_id == user_id))
    await db.execute(delete(MatchingBonus).where(MatchingBonus.user_id == user_id))
    from app.models.rank_history import RankHistory
    await db.execute(delete(RankHistory).where(RankHistory.user_id == user_id))
    from app.models.bank_info import BankInfo
    await db.execute(delete(BankInfo).where(BankInfo.user_id == user_id))
    from app.models.cart import Cart, CartItem
    cart_result = await db.execute(
        select(Cart.id).where(Cart.user_id == user_id)
    )
    cart_ids = [row[0] for row in cart_result.all()]
    if cart_ids:
        await db.execute(delete(CartItem).where(CartItem.cart_id.in_(cart_ids)))
        await db.execute(delete(Cart).where(Cart.id.in_(cart_ids)))

    from app.models.wishlist import WishlistItem
    from app.models.compare import CompareItem
    from app.models.coupon import CouponUsage
    from app.models.ecommerce_wallet_transaction import EcommerceWalletTransaction
    from app.models.ofa_coin_transaction import OFACoinTransaction
    from app.models.product_review import ProductReview
    from app.models.product_view import ProductView
    from app.models.return_request import ReturnRequest
    from app.models.vendor_withdraw import VendorWithdraw
    await db.execute(delete(WishlistItem).where(WishlistItem.user_id == user_id))
    await db.execute(delete(CompareItem).where(CompareItem.user_id == user_id))
    await db.execute(delete(CouponUsage).where(CouponUsage.user_id == user_id))
    await db.execute(delete(EcommerceWalletTransaction).where(EcommerceWalletTransaction.user_id == user_id))
    await db.execute(delete(OFACoinTransaction).where(OFACoinTransaction.user_id == user_id))
    await db.execute(delete(ProductReview).where(ProductReview.user_id == user_id))
    await db.execute(delete(ProductView).where(ProductView.user_id == user_id))
    await db.execute(delete(ReturnRequest).where(ReturnRequest.user_id == user_id))
    await db.execute(delete(VendorWithdraw).where(VendorWithdraw.user_id == user_id))

    user_order_result = await db.execute(
        select(Order.id).where(Order.user_id == user_id)
    )
    user_order_ids = [row[0] for row in user_order_result.all()]

    from app.models.order_attachment import OrderAttachment
    from app.models.order_status_log import OrderStatusLog
    from app.models.product import Product
    seller_result = await db.execute(
        select(Seller.id).where(Seller.user_id == user_id)
    )
    seller_ids = [row[0] for row in seller_result.all()]

    product_ids: list[int] = []
    if seller_ids:
        product_result = await db.execute(
            select(Product.id).where(Product.seller_id.in_(seller_ids))
        )
        product_ids = [row[0] for row in product_result.all()]

    all_order_ids = list(dict.fromkeys(user_order_ids))
    if seller_ids:
        seller_order_result = await db.execute(
            select(Order.id).where(Order.seller_id.in_(seller_ids))
        )
        all_order_ids = list(
            dict.fromkeys(all_order_ids + [row[0] for row in seller_order_result.all()])
        )

    if all_order_ids:
        await db.execute(delete(OrderItem).where(OrderItem.order_id.in_(all_order_ids)))
        await db.execute(delete(OrderAttachment).where(OrderAttachment.order_id.in_(all_order_ids)))
        await db.execute(delete(OrderStatusLog).where(OrderStatusLog.order_id.in_(all_order_ids)))
        await db.execute(delete(CouponUsage).where(CouponUsage.order_id.in_(all_order_ids)))
        await db.execute(delete(EcommerceWalletTransaction).where(EcommerceWalletTransaction.order_id.in_(all_order_ids)))
        await db.execute(delete(ReturnRequest).where(ReturnRequest.order_id.in_(all_order_ids)))
        await db.execute(delete(ProductReview).where(ProductReview.order_id.in_(all_order_ids)))
        await db.execute(delete(Order).where(Order.id.in_(all_order_ids)))

    if product_ids:
        from app.models.product_tag import ProductTag
        from app.models.flash_deal import FlashDealProduct
        from app.models.product_attribute_value import ProductAttributeValue
        from app.models.product_variant import ProductVariant
        await db.execute(delete(CartItem).where(CartItem.product_id.in_(product_ids)))
        await db.execute(delete(WishlistItem).where(WishlistItem.product_id.in_(product_ids)))
        await db.execute(delete(CompareItem).where(CompareItem.product_id.in_(product_ids)))
        await db.execute(delete(ProductReview).where(ProductReview.product_id.in_(product_ids)))
        await db.execute(delete(ProductView).where(ProductView.product_id.in_(product_ids)))
        await db.execute(delete(ProductTag).where(ProductTag.product_id.in_(product_ids)))
        await db.execute(delete(FlashDealProduct).where(FlashDealProduct.product_id.in_(product_ids)))
        await db.execute(delete(ProductAttributeValue).where(ProductAttributeValue.product_id.in_(product_ids)))
        await db.execute(delete(ProductVariant).where(ProductVariant.product_id.in_(product_ids)))
        await db.execute(delete(OrderItem).where(OrderItem.product_id.in_(product_ids)))
        await db.execute(delete(Product).where(Product.id.in_(product_ids)))

    if seller_ids:
        from app.models.seller_delivery_zone import SellerDeliveryZone
        await db.execute(delete(SellerDeliveryZone).where(SellerDeliveryZone.seller_id.in_(seller_ids)))
        await db.execute(delete(VendorWithdraw).where(VendorWithdraw.seller_id.in_(seller_ids)))
        await db.execute(delete(Seller).where(Seller.id.in_(seller_ids)))

    await db.execute(delete(Announcement).where(Announcement.created_by == user_id))

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

    await notify_admin(
        db=db, type="user_deleted",
        message=f"User #{user_id} was deleted by admin",
        request=request,
    )

    return {"message": "User deleted successfully"}


@router.post("/users/{user_id}/credit-profit")
async def credit_user_profit(
    user_id: int,
    payload: CreditProfitRequest,
    request: Request,
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

    await notify_admin(
        db=db, type="profit_credited",
        message=f"Admin credited {profit_amount} USDT profit to user #{user_id}",
        user_id=user_id, request=request,
    )

    return {
        "message": "Profit credited and cascading referral distribution applied",
        "user_no": user.user_no,
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
                "user_no": item.get("user_no"),
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
    for key in ("mining_enabled", "mining_daily_cap", "ofa_to_usdt_rate", "mining_claim_cooldown_minutes", "ofa_signup_bonus", "captcha_timer_seconds"):
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
    if key not in ("mining_enabled", "mining_daily_cap", "ofa_to_usdt_rate", "mining_claim_cooldown_minutes", "ofa_signup_bonus", "captcha_timer_seconds"):
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
    if key == "ofa_to_usdt_rate":
        try:
            rate = Decimal(value)
            if rate <= 0 or rate > 1:
                raise HTTPException(status_code=400, detail="Rate must be between 0 and 1")
        except Exception:
            raise HTTPException(status_code=400, detail="ofa_to_usdt_rate must be a number")
    if key == "mining_claim_cooldown_minutes":
        try:
            cd = int(value)
            if cd < 0 or cd > 1440:
                raise HTTPException(status_code=400, detail="Cooldown must be between 0 and 1440 minutes")
        except Exception:
            raise HTTPException(status_code=400, detail="mining_claim_cooldown_minutes must be a number")
    if key == "ofa_signup_bonus":
        try:
            bonus = Decimal(value)
            if bonus < 0 or bonus > 100000:
                raise HTTPException(status_code=400, detail="Signup bonus must be between 0 and 100000")
        except Exception:
            raise HTTPException(status_code=400, detail="ofa_signup_bonus must be a number")
    if key == "captcha_timer_seconds":
        try:
            timer = int(value)
            if timer < 5 or timer > 300:
                raise HTTPException(status_code=400, detail="Captcha timer must be between 5 and 300 seconds")
        except Exception:
            raise HTTPException(status_code=400, detail="captcha_timer_seconds must be a number")
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


# ── Dynamic Commission Config ──────────────────────────────────
@router.get("/commission-config")
async def get_commission_config(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    from app.core.referral import DEFAULT_REFERRAL_RATES
    configs = {}
    for level in range(1, 6):
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == f"commission_l{level}")
        )
        row = result.scalar_one_or_none()
        if row:
            configs[f"commission_l{level}"] = row.value
        else:
            configs[f"commission_l{level}"] = str(DEFAULT_REFERRAL_RATES[level])
    return {"data": configs}


@router.put("/commission-config/{key}")
async def update_commission_config(
    key: str,
    data: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    from app.core.referral import DEFAULT_REFERRAL_RATES
    valid_keys = {f"commission_l{l}" for l in range(1, 6)}
    if key not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid key. Must be one of: {', '.join(sorted(valid_keys))}")
    try:
        val = Decimal(data.value)
        if val < 0 or val > 100:
            raise HTTPException(status_code=400, detail="Commission must be between 0 and 100")
    except Exception:
        raise HTTPException(status_code=400, detail="Value must be a valid decimal number")

    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    if config:
        config.value = data.value
    else:
        config = SystemConfig(key=key, value=data.value)
        db.add(config)
    await db.commit()
    return {"message": f"Commission {key} updated to {data.value}%"}


# ── Transfer & Withdrawal Charge Config ────────────────────────
@router.get("/fee-config")
async def get_fee_config(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    configs = {}
    for key in ["transfer_charge_percent", "withdrawal_charge_percent", "kyc_fee", "kyc_package_enabled", "min_deposit_amount", "withdrawal_mode"]:
        result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
        row = result.scalar_one_or_none()
        if key == "kyc_package_enabled":
            configs[key] = row.value if row else "true"
        elif key == "min_deposit_amount":
            configs[key] = row.value if row else "10"
        elif key == "withdrawal_mode":
            configs[key] = row.value if row else "both"
        else:
            configs[key] = row.value if row else ("5" if "charge" in key else "0")
    return {"data": configs}


@router.put("/fee-config/{key}")
async def update_fee_config(
    key: str,
    data: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    valid_keys = {"transfer_charge_percent", "withdrawal_charge_percent", "kyc_fee", "kyc_package_enabled", "min_deposit_amount", "withdrawal_mode"}
    if key not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid key. Must be one of: {', '.join(sorted(valid_keys))}")
    if key == "kyc_package_enabled":
        if data.value.lower() not in ("true", "false"):
            raise HTTPException(status_code=400, detail="Value must be 'true' or 'false'")
    elif key == "withdrawal_mode":
        if data.value not in ("banking_only", "network_only", "both"):
            raise HTTPException(status_code=400, detail="Value must be 'banking_only', 'network_only', or 'both'")
    else:
        try:
            val = Decimal(data.value)
            if val < 0:
                raise HTTPException(status_code=400, detail="Value must not be negative")
            if key != "kyc_fee" and key != "min_deposit_amount" and val > 100:
                raise HTTPException(status_code=400, detail="Charge must be between 0 and 100")
        except Exception:
            raise HTTPException(status_code=400, detail="Value must be a valid decimal number")

    result = await db.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    if config:
        config.value = data.value
    else:
        config = SystemConfig(key=key, value=data.value)
        db.add(config)
    await db.commit()
    labels = {
        "kyc_fee": "KYC fee",
        "kyc_package_enabled": "KYC package",
        "transfer_charge_percent": "Transfer % charge",
        "withdrawal_charge_percent": "Withdrawal % charge",
        "min_deposit_amount": "Minimum deposit amount",
        "withdrawal_mode": "Withdrawal mode",
    }
    label = labels.get(key, key.replace("_", " ").title())
    suffix = "" if key in ("kyc_fee", "kyc_package_enabled", "min_deposit_amount", "withdrawal_mode") else "%"
    return {"message": f"{label} updated to {data.value}{suffix}"}


# ── KYC Package CRUD ────────────────────────────────────────────────────


@router.get("/kyc-packages")
async def get_kyc_packages(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    result = await db.execute(
        select(KycPackage).order_by(KycPackage.created_at.desc())
    )
    packages = result.scalars().all()
    return {
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "price": str(p.price),
                "description": p.description,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in packages
        ]
    }


@router.post("/kyc-packages")
async def create_kyc_package(
    name: str,
    price: str,
    description: str = "",
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    try:
        price_decimal = Decimal(price)
        if price_decimal < 0:
            raise ValueError
    except Exception:
        raise HTTPException(status_code=400, detail="Price must be a valid non-negative number")

    pkg = KycPackage(
        name=name.strip(),
        price=price_decimal,
        description=description.strip() if description else None,
    )
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return {
        "message": "KYC package created",
        "package": {
            "id": pkg.id,
            "name": pkg.name,
            "price": str(pkg.price),
            "is_active": pkg.is_active,
        }
    }


@router.put("/kyc-packages/{package_id}")
async def update_kyc_package(
    package_id: int,
    name: str = "",
    price: str = "",
    description: str = "",
    is_active: bool = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    result = await db.execute(select(KycPackage).where(KycPackage.id == package_id))
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="KYC package not found")

    if name.strip():
        pkg.name = name.strip()
    if price:
        try:
            price_decimal = Decimal(price)
            if price_decimal < 0:
                raise ValueError
            pkg.price = price_decimal
        except Exception:
            raise HTTPException(status_code=400, detail="Price must be a valid non-negative number")
    if description is not None:
        pkg.description = description.strip() if description.strip() else None
    if is_active is not None:
        pkg.is_active = is_active

    await db.commit()
    await db.refresh(pkg)
    return {
        "message": "KYC package updated",
        "package": {
            "id": pkg.id,
            "name": pkg.name,
            "price": str(pkg.price),
            "is_active": pkg.is_active,
        }
    }


@router.delete("/kyc-packages/{package_id}")
async def deactivate_kyc_package(
    package_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    result = await db.execute(select(KycPackage).where(KycPackage.id == package_id))
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="KYC package not found")

    pkg.is_active = False
    await db.commit()
    return {"message": "KYC package deactivated"}


KYC_NOTICE_TEMPLATES = [
    {"id": "doc_unclear", "text": "Documents are unclear or illegible. Please upload clearer images."},
    {"id": "doc_expired", "text": "The document provided appears to be expired. Please provide a valid document."},
    {"id": "doc_mismatch", "text": "Document details do not match the information provided. Please review and resubmit."},
    {"id": "missing_info", "text": "Required information is missing. Please complete all fields."},
    {"id": "approved_std", "text": "Your KYC verification has been approved. You can now access all platform features."},
]


@router.get("/kyc-notice-templates")
async def get_kyc_notice_templates(
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    return {"data": KYC_NOTICE_TEMPLATES}


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
                "user_no": u.user_no,
                "full_name": u.full_name,
                "email": u.email,
                "mining_active": u.mining_active,
                "daily_mined": float(u.daily_mined or 0),
                "arbx_wallet": float(u.arbx_wallet or 0),
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
                "earn_per_captcha": float(p.earn_per_captcha or 0),
                "daily_captcha_limit": p.daily_captcha_limit or 0,
                "task_type": p.task_type.value if p.task_type else "captcha",
                "ad_duration_seconds": p.ad_duration_seconds or 30,
                "signup_arbx_bonus": float(p.signup_arbx_bonus or 0),
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
    earn_per_captcha: float | None = None,
    daily_captcha_limit: int | None = None,
    task_type: str | None = None,
    ad_duration_seconds: int | None = None,
    signup_arbx_bonus: float | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package, TaskType
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
    if earn_per_captcha is not None:
        package.earn_per_captcha = Decimal(str(earn_per_captcha))
    if daily_captcha_limit is not None:
        package.daily_captcha_limit = daily_captcha_limit
    if task_type is not None:
        package.task_type = TaskType(task_type)
    if ad_duration_seconds is not None:
        package.ad_duration_seconds = ad_duration_seconds
    if signup_arbx_bonus is not None:
        package.signup_arbx_bonus = Decimal(str(signup_arbx_bonus))
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

    # Gather user IDs to batch-query captcha and ad view totals
    user_ids = [user.id for _, user in rows]

    # Batch query total captcha earned per user
    captcha_totals = {}
    if user_ids:
        captcha_result = await db.execute(
            select(CaptchaEarning.user_id, func.coalesce(func.sum(CaptchaEarning.amount_earned), 0))
            .where(CaptchaEarning.user_id.in_(user_ids), CaptchaEarning.is_correct == True)
            .group_by(CaptchaEarning.user_id)
        )
        captcha_totals = {row[0]: float(row[1]) for row in captcha_result.all()}

    # Batch query total ad view earned per user
    ad_totals = {}
    if user_ids:
        ad_result = await db.execute(
            select(AdView.user_id, func.coalesce(func.sum(AdView.amount_earned), 0))
            .where(AdView.user_id.in_(user_ids), AdView.is_completed == True)
            .group_by(AdView.user_id)
        )
        ad_totals = {row[0]: float(row[1]) for row in ad_result.all()}

    return {
        "package_name": package.name,
        "total_subscribers": total,
        "page": page,
        "page_size": PAGE_SIZE,
        "total_pages": (total + PAGE_SIZE - 1) // PAGE_SIZE,
        "subscribers": [
            {
                "investment_id": inv.id,
                "user_no": user.user_no,
                "username": user.username,
                "email": user.email,
                "invested_amount": float(inv.invested_amount),
                "daily_payment": float(inv.daily_payment or 0),
                "profit_earned": float(inv.profit_earned),
                "expected_profit": float(inv.expected_profit),
                "start_date": inv.start_date.isoformat() if inv.start_date else None,
                "status": inv.status,
                "total_captcha_earned": captcha_totals.get(user.id, 0),
                "total_ad_view_earned": ad_totals.get(user.id, 0),
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
    earn_per_captcha: float = 0.01,
    daily_captcha_limit: int = 12,
    task_type: str = "captcha",
    ad_duration_seconds: int = 30,
    signup_arbx_bonus: float = 0,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    from app.models.package import Package, TaskType

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
        earn_per_captcha=Decimal(str(earn_per_captcha)),
        daily_captcha_limit=daily_captcha_limit,
        task_type=TaskType(task_type),
        ad_duration_seconds=ad_duration_seconds,
        signup_arbx_bonus=Decimal(str(signup_arbx_bonus)),
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


# ── Real-time Statistics ─────────────────────────────────────────────────

@router.get("/realtime-stats")
async def get_realtime_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    approved_deposits_result = await db.execute(
        select(func.coalesce(func.sum(Deposit.amount), 0)).where(Deposit.status == "approved")
    )
    total_deposited = Decimal(str(approved_deposits_result.scalar() or 0))

    approved_withdrawals_result = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(Withdrawal.status == "approved")
    )
    total_withdrawn = Decimal(str(approved_withdrawals_result.scalar() or 0))

    users_with_deposits_result = await db.execute(
        select(func.count(func.distinct(Deposit.user_id))).where(Deposit.status == "approved")
    )
    users_with_deposits = users_with_deposits_result.scalar() or 0

    total_transferred_result = await db.execute(
        select(func.coalesce(func.sum(TransferLog.amount), 0))
    )
    total_transferred = Decimal(str(total_transferred_result.scalar() or 0))

    total_referral_result = await db.execute(
        select(func.coalesce(func.sum(ReferralProfitHistory.amount), 0))
        .where(ReferralProfitHistory.level == 1)
    )
    total_referral = Decimal(str(total_referral_result.scalar() or 0))

    generation_result = await db.execute(
        select(func.coalesce(func.sum(ReferralProfitHistory.amount), 0))
        .where(ReferralProfitHistory.level > 1)
    )
    total_generation_bonus = Decimal(str(generation_result.scalar() or 0))

    total_matching_result = await db.execute(
        select(func.coalesce(func.sum(MatchingBonus.bonus_amount), 0))
        .where(MatchingBonus.is_reversed == False)
    )
    total_matching = Decimal(str(total_matching_result.scalar() or 0))

    total_profit_result = await db.execute(
        select(func.coalesce(func.sum(InvestmentProfitHistory.amount), 0))
    )
    total_profit_shared = Decimal(str(total_profit_result.scalar() or 0))

    total_mining_result = await db.execute(
        select(func.coalesce(func.sum(MiningLog.amount), 0))
    )
    total_mining = Decimal(str(total_mining_result.scalar() or 0))

    total_captcha_result = await db.execute(
        select(func.coalesce(func.sum(CaptchaEarning.amount_earned), 0))
    )
    total_captcha = Decimal(str(total_captcha_result.scalar() or 0))

    total_ad_result = await db.execute(
        select(func.coalesce(func.sum(AdView.amount_earned), 0))
    )
    total_ad = Decimal(str(total_ad_result.scalar() or 0))

    total_distributed = total_referral + total_generation_bonus + total_matching + total_profit_shared + total_captcha + total_ad

    ecommerce_result = await db.execute(
        select(func.coalesce(func.sum(User.ecommerce_wallet), 0))
    )
    total_ecommerce_funded = Decimal(str(ecommerce_result.scalar() or 0))

    # ── Overview Stats ──────────────────────────────────
    total_members_result = await db.execute(select(func.count(User.id)))
    total_members = total_members_result.scalar() or 0

    total_active_kyc_result = await db.execute(
        select(func.count(User.id)).where(User.admin_kyc_status == "approved")
    )
    total_active_kyc = total_active_kyc_result.scalar() or 0

    total_inactive = total_members - total_active_kyc

    total_ecommerce_sellers_result = await db.execute(
        select(func.count(Seller.id))
    )
    total_ecommerce_sellers = total_ecommerce_sellers_result.scalar() or 0

    # ── Balance Area ────────────────────────────────────
    # Base kyc_fee per paid record + optional package price
    kyc_fee_cfg_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "kyc_fee")
    )
    kyc_fee_cfg = kyc_fee_cfg_result.scalar_one_or_none()
    kyc_fee = Decimal(kyc_fee_cfg.value) if kyc_fee_cfg else Decimal("0")

    paid_kyc_count_result = await db.execute(
        select(func.count(KYC.id))
        .where(KYC.payment_status == PaymentStatus.paid)
    )
    paid_kyc_count = paid_kyc_count_result.scalar() or 0

    kyc_package_total_result = await db.execute(
        select(func.coalesce(func.sum(KycPackage.price), 0))
        .select_from(KYC)
        .join(KycPackage, KYC.kyc_package_id == KycPackage.id)
        .where(KYC.payment_status == PaymentStatus.paid)
    )
    kyc_package_total = Decimal(str(kyc_package_total_result.scalar() or 0))

    total_kyc_purchases_usd = paid_kyc_count * kyc_fee + kyc_package_total

    total_paid_package_investment_result = await db.execute(
        select(func.coalesce(func.sum(Investment.invested_amount), 0))
    )
    total_paid_package_investment = Decimal(str(total_paid_package_investment_result.scalar() or 0))

    # ── Distribution Identify Area ──────────────────────
    total_referral_distribution = total_referral
    total_matching_bonus = total_matching
    total_captcha_distribution = total_captcha
    total_ad_view_distribution = total_ad

    free_package_result = await db.execute(
        select(func.coalesce(func.sum(InvestmentProfitHistory.amount), 0))
        .select_from(InvestmentProfitHistory)
        .join(Investment, InvestmentProfitHistory.investment_id == Investment.id)
        .where(Investment.invested_amount == 0)
    )
    total_free_package_distribution = Decimal(str(free_package_result.scalar() or 0))

    # ── Free Package User Earnings ──────────────────────
    free_pkg_users_subq = select(Investment.user_id).where(Investment.invested_amount == 0).subquery()

    free_pkg_captcha_result = await db.execute(
        select(func.coalesce(func.sum(CaptchaEarning.amount_earned), 0))
        .where(CaptchaEarning.user_id.in_(select(free_pkg_users_subq.c.user_id)))
    )
    total_free_package_captcha_earnings = Decimal(str(free_pkg_captcha_result.scalar() or 0))

    free_pkg_ad_result = await db.execute(
        select(func.coalesce(func.sum(AdView.amount_earned), 0))
        .where(AdView.user_id.in_(select(free_pkg_users_subq.c.user_id)))
    )
    total_free_package_ad_earnings = Decimal(str(free_pkg_ad_result.scalar() or 0))
    total_free_user_earnings = total_free_package_captcha_earnings + total_free_package_ad_earnings

    # ── Paid Package User Earnings ──────────────────────
    paid_pkg_users_subq = select(Investment.user_id).where(Investment.invested_amount > 0).subquery()

    paid_pkg_captcha_result = await db.execute(
        select(func.coalesce(func.sum(CaptchaEarning.amount_earned), 0))
        .where(CaptchaEarning.user_id.in_(select(paid_pkg_users_subq.c.user_id)))
    )
    total_paid_package_captcha_earnings = Decimal(str(paid_pkg_captcha_result.scalar() or 0))

    paid_pkg_ad_result = await db.execute(
        select(func.coalesce(func.sum(AdView.amount_earned), 0))
        .where(AdView.user_id.in_(select(paid_pkg_users_subq.c.user_id)))
    )
    total_paid_package_ad_earnings = Decimal(str(paid_pkg_ad_result.scalar() or 0))
    total_paid_user_earnings = total_paid_package_captcha_earnings + total_paid_package_ad_earnings

    # ── Real-time Summary ───────────────────────────────
    from datetime import datetime, timezone, timedelta
    five_min_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    online_result = await db.execute(
        select(func.count(func.distinct(VisitorLog.session_id)))
        .where(VisitorLog.visited_at >= five_min_ago)
    )
    online_users_live = online_result.scalar() or 0

    total_profit_distribution = total_profit_shared
    company_running_profit = total_deposited - total_withdrawn - total_distributed

    return {
        # Overview
        "total_members": total_members,
        "total_active_kyc": total_active_kyc,
        "total_inactive": total_inactive,
        "total_ecommerce_sellers": total_ecommerce_sellers,
        # Balance
        "total_deposited": format_decimal(total_deposited),
        "total_withdrawn": format_decimal(total_withdrawn),
        "total_transferred": format_decimal(total_transferred),
        "total_kyc_purchases_usd": format_decimal(total_kyc_purchases_usd),
        "total_paid_package_investment": format_decimal(total_paid_package_investment),
        "total_ecommerce_funded": format_decimal(total_ecommerce_funded),
        # Distributions
        "total_referral_distribution": format_decimal(total_referral_distribution),
        "total_generation_bonus": format_decimal(total_generation_bonus),
        "total_matching_bonus": format_decimal(total_matching_bonus),
        "total_captcha_distribution": format_decimal(total_captcha_distribution),
        "total_ad_view_distribution": format_decimal(total_ad_view_distribution),
        "total_free_package_distribution": format_decimal(total_free_package_distribution),
        "total_free_package_captcha_earnings": format_decimal(total_free_package_captcha_earnings),
        "total_free_package_ad_earnings": format_decimal(total_free_package_ad_earnings),
        "total_free_user_earnings": format_decimal(total_free_user_earnings),
        "total_paid_package_captcha_earnings": format_decimal(total_paid_package_captcha_earnings),
        "total_paid_package_ad_earnings": format_decimal(total_paid_package_ad_earnings),
        "total_paid_user_earnings": format_decimal(total_paid_user_earnings),
        # Summary
        "online_users_live": online_users_live,
        "total_profit_distribution": format_decimal(total_profit_distribution),
        "company_running_profit": format_decimal(company_running_profit),
        "total_distribution": format_decimal(total_distributed),
        "total_mining_ofa": format_decimal(total_mining),
    }

