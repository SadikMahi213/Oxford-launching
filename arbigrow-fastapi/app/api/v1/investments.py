from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.user import User
from app.models.investments import Investment
from app.models.package import Package
from app.schemas.investment import BuyInvestmentRequest, BuyInvestmentResponse
from app.api.v1.deps import get_current_user, check_earning_access
from app.core.rate_limiter import limiter
from app.models.investment_profit_history import InvestmentProfitHistory
from app.utils.notifications import notify_admin


router = APIRouter(prefix="/investments", tags=["Investments"])
WALLET_PRECISION = Decimal("0.00000000000001")
PERCENT_PRECISION = Decimal("0.0001")


def _get_remaining_percentage(inv: Investment) -> Decimal:
    remaining = inv.roi_percent - inv.profit_percentage_paid
    return max(Decimal("0"), remaining)


def _get_progress_percentage(inv: Investment) -> Decimal:
    if inv.roi_percent <= 0:
        return Decimal("0")
    progress = (inv.profit_percentage_paid / inv.roi_percent) * Decimal("100")
    progress = min(Decimal("100"), progress)
    return progress.quantize(PERCENT_PRECISION, rounding=ROUND_HALF_UP)


@router.post("/buy", response_model=BuyInvestmentResponse)
@limiter.limit("20/minute")
async def buy_investment(
    request: Request,
    payload: BuyInvestmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    amount = Decimal(str(payload.amount))

    # Free package activation does not require an active account
    if amount > 0:
        check_earning_access(current_user)

    # Look up the package by name
    pkg_result = await db.execute(
        select(Package).where(Package.name == payload.package_name, Package.is_active == True)
    )
    package = pkg_result.scalar_one_or_none()

    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Package not found or inactive",
        )

    # Validate the amount matches the package
    if amount != package.investment_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Amount must be exactly {package.investment_amount} for this package",
        )

    # Free ($0) packages can only be purchased once per user
    if amount == 0:
        existing = await db.execute(
            select(Investment).where(
                Investment.user_id == current_user.id,
                Investment.package_name == package.name,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already own this free package. It can only be activated once.",
            )

    user_result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .with_for_update()
    )
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Activate user account if purchasing a free package
    if amount == 0 and user.account_status == "inactive":
        user.account_status = "active"

    # check balance in deposit wallet
    if user.deposit_wallet < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient deposit wallet balance",
        )

    # Calculate expected profit and ROI from package
    expected_profit = (package.total_return - package.investment_amount).quantize(
        WALLET_PRECISION,
        rounding=ROUND_HALF_UP,
    )
    if package.investment_amount > 0:
        roi_percent = ((package.total_return / package.investment_amount) * Decimal("100")).quantize(
            PERCENT_PRECISION,
            rounding=ROUND_HALF_UP,
        )
    else:
        roi_percent = Decimal("0")

    start_date = datetime.now(timezone.utc)
    if amount == 0:
        end_date = start_date + timedelta(days=36500)  # ~100 years for free packages
    else:
        end_date = start_date + timedelta(days=package.duration_days)

    # deduct from deposit wallet
    user.deposit_wallet = (user.deposit_wallet - amount).quantize(
        WALLET_PRECISION,
        rounding=ROUND_HALF_UP,
    )

    investment = Investment(
        user_id=user.id,
        package_name=package.name,
        invested_amount=amount,
        roi_percent=roi_percent,
        expected_profit=expected_profit,
        daily_payment=package.daily_payment,
        captcha_required_per_day=package.captcha_required_per_day,
        earn_per_captcha=package.earn_per_captcha,
        daily_captcha_limit=package.daily_captcha_limit,
        captchas_typed_today=0,
        start_date=start_date,
        end_date=end_date,
        status="active",
    )

    db.add(investment)

    await db.commit()
    await db.refresh(investment)
    await db.refresh(user)

    # Trigger rank evaluation for the purchaser
    if amount > 0:
        from app.services.rank_service import evaluate_and_process_rank
        await evaluate_and_process_rank(
            user_id=user.id,
            db=db,
            source_user_id=user.id,
            reference_id=investment.id,
            reference_type="investment",
        )

        # Also trigger rank evaluation for ALL ancestors up the parent_lvl_1_id chain
        next_id = user.parent_lvl_1_id
        while next_id:
            await evaluate_and_process_rank(
                user_id=next_id,
                db=db,
                source_user_id=user.id,
                reference_id=investment.id,
                reference_type="investment",
            )
            # Walk up the chain
            par = await db.get(User, next_id)
            next_id = par.parent_lvl_1_id if par else None

        await db.commit()

    await notify_admin(
        db=db, type="package_purchased",
        message=f"User {current_user.full_name} purchased package {package.name} for {amount} USDT",
        user_id=current_user.id, request=request,
    )

    return BuyInvestmentResponse(
        id=investment.id,
        package_name=investment.package_name,
        invested_amount=investment.invested_amount,
        roi_percent=investment.roi_percent,
        expected_profit=investment.expected_profit,
        status=investment.status,
        deposit_wallet_balance=user.deposit_wallet,
    )


@router.get("/packages")
@limiter.limit("100/minute")
async def list_active_packages(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Package)
        .where(Package.is_active == True)
        .order_by(Package.investment_amount.asc())
    )
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
            }
            for p in packages
        ]
    }


@router.get("/my")
@limiter.limit("300/minute")
async def get_my_investments(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    result = await db.execute(
        select(Investment)
        .where(Investment.user_id == current_user.id)
        .order_by(Investment.created_at.desc())
    )

    investments = result.scalars().all()

    return [
        {
            "id": inv.id,
            "package_name": inv.package_name,
            "invested_amount": inv.invested_amount,
            "roi_percent": inv.roi_percent,
            "expected_profit": inv.expected_profit,
            "daily_payment": float(inv.daily_payment or 0),
            "captcha_required_per_day": inv.captcha_required_per_day or 0,
            "earn_per_captcha": float(inv.earn_per_captcha or 0),
            "daily_captcha_limit": inv.daily_captcha_limit or 0,
            "captchas_typed_today": inv.captchas_typed_today or 0,
            "profit_earned": inv.profit_earned,
            "profit_percentage_paid": inv.profit_percentage_paid,
            "remaining_percentage": _get_remaining_percentage(inv),
            "remaining_profit": float(inv.expected_profit - inv.profit_earned),
            "progress_percentage": _get_progress_percentage(inv),
            "start_date": inv.start_date,
            "end_date": inv.end_date,
            "status": inv.status,
        }
        for inv in investments
    ]


@router.get("/{investment_id}")
@limiter.limit("200/minute")
async def get_investment_details(
    request: Request,
    investment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    result = await db.execute(
        select(Investment).where(
            Investment.id == investment_id,
            Investment.user_id == current_user.id
        )
    )

    investment = result.scalar_one_or_none()

    if not investment:
        raise HTTPException(404, "Investment not found")

    history_result = await db.execute(
        select(InvestmentProfitHistory)
        .where(InvestmentProfitHistory.investment_id == investment.id)
        .order_by(InvestmentProfitHistory.created_at.desc())
    )

    history = history_result.scalars().all()

    return {
        "investment": {
            "id": investment.id,
            "package_name": investment.package_name,
            "invested_amount": investment.invested_amount,
            "roi_percent": investment.roi_percent,
            "expected_profit": investment.expected_profit,
            "daily_payment": float(investment.daily_payment or 0),
            "captcha_required_per_day": investment.captcha_required_per_day or 0,
            "earn_per_captcha": float(investment.earn_per_captcha or 0),
            "daily_captcha_limit": investment.daily_captcha_limit or 0,
            "captchas_typed_today": investment.captchas_typed_today or 0,
            "profit_earned": investment.profit_earned,
            "profit_percentage_paid": investment.profit_percentage_paid,
            "remaining_percentage": _get_remaining_percentage(investment),
            "remaining_profit": float(investment.expected_profit - investment.profit_earned),
            "progress_percentage": _get_progress_percentage(investment),
            "start_date": investment.start_date,
            "end_date": investment.end_date,
            "status": investment.status,
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
