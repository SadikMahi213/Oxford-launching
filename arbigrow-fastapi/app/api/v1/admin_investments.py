from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.core.referral import get_referral_level_rates

from app.models.user import User
from app.models.investments import Investment
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.referral_profit_history import ReferralProfitHistory

from app.schemas.investment import AddProfitRequest
from app.schemas.roi import ALL_PACKAGE_NAMES

# reverse map: package_name -> tier_name (now flat, each package is its own "tier")
PACKAGE_TIER_MAP: dict[str, str] = {
    pkg: pkg for pkg in ALL_PACKAGE_NAMES
}

from app.api.v1.deps import get_current_user
from app.core.rate_limiter import limiter


router = APIRouter(prefix="/admin/investments", tags=["Admin Investments"])
MIN_DAILY_ROI_PERCENT = Decimal("0.01")


@router.post("/{investment_id}/add-profit")
@limiter.limit("60/minute")
async def add_profit(
    request: Request,
    investment_id: int,
    payload: AddProfitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if not current_user.is_admin:
        raise HTTPException(403, "Admin only")

    percentage = Decimal(payload.percentage)

    try:

        # 🔒 lock investment row
        result = await db.execute(
            select(Investment)
            .where(Investment.id == investment_id)
            .with_for_update()
        )
        investment = result.scalar_one_or_none()

        if not investment:
            raise HTTPException(404, "Investment not found")

        if investment.status != "active":
            raise HTTPException(400, "Investment not active")

        remaining_percentage = (
            investment.roi_percent - investment.profit_percentage_paid
        )

        minimum_allowed_percentage = (
            MIN_DAILY_ROI_PERCENT
            if remaining_percentage >= MIN_DAILY_ROI_PERCENT
            else Decimal("0.0001")
        )

        if percentage < minimum_allowed_percentage:
            raise HTTPException(
                400,
                f"Percentage must be at least {minimum_allowed_percentage}%",
            )

        if percentage > remaining_percentage:
            raise HTTPException(
                400,
                f"Only {remaining_percentage}% ROI remaining"
            )

        # calculate profit
        profit_amount = (
            investment.invested_amount * percentage
        ) / Decimal("100")

        # 🔒 lock user wallet
        user_result = await db.execute(
            select(User)
            .where(User.id == investment.user_id)
            .with_for_update()
        )
        user = user_result.scalar_one()

        # credit profit
        user.main_wallet += profit_amount

        # update investment progress
        investment.profit_earned += profit_amount
        investment.profit_percentage_paid += percentage

        history = InvestmentProfitHistory(
            investment_id=investment.id,
            amount=profit_amount,
            percentage=percentage,
            created_at=datetime.now(timezone.utc),
        )

        db.add(history)

        # FETCH ALL PARENTS

        parent_ids = [
            user.parent_lvl_1_id,
            user.parent_lvl_2_id,
            user.parent_lvl_3_id,
            user.parent_lvl_4_id,
            user.parent_lvl_5_id,
        ]

        parents_map = {}
        active_parent_ids: set[int] = set()
        pids_filtered = [p for p in parent_ids if p]

        if pids_filtered:

            parents_result = await db.execute(
                select(User)
                .where(User.id.in_(pids_filtered))
                .with_for_update()
            )

            parents = parents_result.scalars().all()

            parents_map = {p.id: p for p in parents}

            # Only credit parents who have at least one active package
            active_result = await db.execute(
                select(Investment.user_id)
                .where(Investment.user_id.in_(pids_filtered), Investment.status == "active")
                .distinct()
            )
            active_parent_ids = set(active_result.scalars().all())

        # FLAT COMMISSION

        rates = await get_referral_level_rates(db)

        for level_idx, parent_id in enumerate(parent_ids):
            if not parent_id:
                continue
            parent = parents_map.get(parent_id)
            if not parent:
                continue

            level = level_idx + 1
            rate = rates[level]

            reward = (
                profit_amount * rate
            ) / Decimal("100")

            if parent_id in active_parent_ids:
                if level == 1:
                    parent.referral_wallet += reward
                else:
                    parent.generation_wallet += reward

                referral_history = ReferralProfitHistory(
                    source_user_id=user.id,
                    receiver_user_id=parent.id,
                    investment_id=investment.id,
                    level=level,
                    percentage=rate,
                    amount=reward,
                    type="daily_roi",
                    created_at=datetime.now(timezone.utc),
                )

                db.add(referral_history)

        # complete investment
        if investment.profit_earned >= investment.expected_profit:
            investment.status = "completed"

        await db.commit()

        return {
            "success": True,
            "profit_added": profit_amount,
            "percentage_added": percentage,
            "remaining_percentage": investment.expected_profit - investment.profit_earned,
        }

    except Exception as e:
        await db.rollback()
        raise e


@router.get("/")
@limiter.limit("500/minute")
async def get_all_investments(
    request: Request,
    page: int = Query(1, ge=1),
    status_filter: str | None = Query(None, pattern="^(active|completed)$"),
    search: str | None = Query(None, min_length=1, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if not current_user.is_admin:
        raise HTTPException(403, "Admin only")

    PAGE_SIZE = 50
    offset = (page - 1) * PAGE_SIZE

    # BASE QUERY

    query = (
        select(Investment, User)
        .join(User, User.id == Investment.user_id)
    )

    # FILTER: STATUS

    if status_filter:
        query = query.where(Investment.status == status_filter)

    # SEARCH

    if search:

        search_term = f"%{search}%"

        query = query.where(
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                Investment.package_name.ilike(search_term),
            )
        )

    # COUNT QUERY

    count_query = (
        select(func.count())
        .select_from(Investment)
        .join(User, User.id == Investment.user_id)
    )

    if status_filter:
        count_query = count_query.where(Investment.status == status_filter)

    if search:
        count_query = count_query.where(
            or_(
                User.username.ilike(search_term),
                User.email.ilike(search_term),
                Investment.package_name.ilike(search_term),
            )
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # PAGINATION

    query = (
        query.order_by(Investment.created_at.desc())
        .offset(offset)
        .limit(PAGE_SIZE)
    )

    result = await db.execute(query)

    rows = result.all()

    return {
        "page": page,
        "page_size": PAGE_SIZE,
        "total": total,
        "total_pages": (total + PAGE_SIZE - 1) // PAGE_SIZE,
        "items": [
            {
                "investment_id": inv.id,
                "user_no": user.user_no,
                "username": user.username,
                "email": user.email,
                "package_name": inv.package_name,
                "tier_name": PACKAGE_TIER_MAP.get(inv.package_name, "—"),
                "invested_amount": inv.invested_amount,
                "roi_percent": inv.roi_percent,
                "expected_profit": inv.expected_profit,
                "profit_earned": inv.profit_earned,
                "daily_payment": float(inv.daily_payment or 0),
                "captcha_required_per_day": inv.captcha_required_per_day or 0,
                "percentage_paid": inv.profit_percentage_paid,
                "remaining_profit": float(inv.expected_profit - inv.profit_earned),
                "start_date": inv.start_date,
                "end_date": inv.end_date,
                "status": inv.status
            }
            for inv, user in rows
        ]
    }


@router.get("/{investment_id}")
@limiter.limit("500/minute")
async def get_admin_investment_details(
    request: Request,
    investment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if not current_user.is_admin:
        raise HTTPException(403, "Admin only")

    result = await db.execute(
        select(Investment, User)
        .join(User, User.id == Investment.user_id)
        .where(Investment.id == investment_id)
    )

    row = result.first()

    if not row:
        raise HTTPException(404, "Investment not found")

    investment, user = row

    history_result = await db.execute(
        select(InvestmentProfitHistory)
        .where(InvestmentProfitHistory.investment_id == investment.id)
        .order_by(InvestmentProfitHistory.created_at.desc())
    )

    history = history_result.scalars().all()

    return {
        "user": {
            "user_no": user.user_no,
            "username": user.username,
            "email": user.email
        },
        "investment": {
            "id": investment.id,
            "package_name": investment.package_name,
            "invested_amount": investment.invested_amount,
            "start_date": investment.start_date,
            "end_date": investment.end_date,
            "roi_percent": investment.roi_percent,
            "daily_payment": float(investment.daily_payment or 0),
            "captcha_required_per_day": investment.captcha_required_per_day or 0,
            "profit_earned": investment.profit_earned,
            "percentage_paid": investment.profit_percentage_paid,
            "remaining_profit": float(investment.expected_profit - investment.profit_earned),
            "expected_profit": investment.expected_profit,
            "status": investment.status
        },
        "profit_history": [
            {
                "amount": h.amount,
                "percentage": h.percentage,
                "date": h.created_at
            }
            for h in history
        ]
    }
