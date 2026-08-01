from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_admin_user
from app.core.database import get_db
from app.core.rate_limiter import limiter
from app.core.referral import get_referral_level_rates
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.investments import Investment
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.roi_setting import ROISetting
from app.models.user import User
from app.schemas.roi import ROISettingUpdate, ROIPackageApply, ALL_PACKAGE_NAMES

router = APIRouter(prefix="/admin/roi", tags=["Admin ROI"])

ROI_SETTING_KEY = "global_daily_roi_percent"
MIN_ROI_PERCENT = Decimal("1")
MAX_ROI_PERCENT = Decimal("5")
DEFAULT_ROI_PERCENT = Decimal("3")


def _validate_percentage(percentage: Decimal) -> None:
    if percentage < MIN_ROI_PERCENT or percentage > MAX_ROI_PERCENT:
        raise HTTPException(
            status_code=400,
            detail=f"ROI must be between {MIN_ROI_PERCENT}% and {MAX_ROI_PERCENT}%",
        )


async def _get_or_create_setting(db: AsyncSession) -> ROISetting:
    result = await db.execute(
        select(ROISetting)
        .where(ROISetting.key == ROI_SETTING_KEY)
        .with_for_update()
    )
    setting = result.scalar_one_or_none()
    if setting:
        return setting

    setting = ROISetting(
        key=ROI_SETTING_KEY,
        roi_percent=DEFAULT_ROI_PERCENT,
    )
    db.add(setting)
    await db.flush()
    return setting


@router.get("/")
@limiter.limit("200/minute")
async def get_roi_setting(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    del request, current_user
    setting = await _get_or_create_setting(db)
    await db.commit()
    await db.refresh(setting)
    return {
        "percentage": setting.roi_percent,
        "min_percentage": MIN_ROI_PERCENT,
        "max_percentage": MAX_ROI_PERCENT,
        "updated_at": setting.updated_at,
    }


@router.put("/")
@limiter.limit("60/minute")
async def update_roi_setting(
    request: Request,
    payload: ROISettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    del request, current_user

    percentage = Decimal(str(payload.percentage))
    _validate_percentage(percentage)

    setting = await _get_or_create_setting(db)
    setting.roi_percent = percentage

    await db.commit()
    await db.refresh(setting)

    return {
        "message": "Global ROI percentage updated",
        "percentage": setting.roi_percent,
        "updated_at": setting.updated_at,
    }


@router.post("/apply")
@limiter.limit("20/minute")
async def apply_roi_to_all_active_investments(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    del request

    now_utc = datetime.now(timezone.utc)
    setting = await _get_or_create_setting(db)
    percentage = Decimal(str(setting.roi_percent))
    _validate_percentage(percentage)

    result = await db.execute(
        select(Investment)
        .where(Investment.status == "active")
        .with_for_update()
    )
    investments = result.scalars().all()

    processed = len(investments)
    credited = 0
    completed_now = 0
    skipped = 0

    rates = await get_referral_level_rates(db)

    for investment in investments:
        # Guard: paid packages snapshot with missing roi_percent (legacy
        # registration rows) must not be falsely completed; keep them active
        # so the dashboard can still detect the active package.
        if (
            investment.roi_percent <= 0
            and investment.invested_amount > 0
            and (investment.daily_payment or 0) > 0
        ):
            skipped += 1
            continue

        remaining_percentage = investment.roi_percent - investment.profit_percentage_paid
        if remaining_percentage <= 0:
            if investment.status != "completed":
                investment.status = "completed"
                completed_now += 1
            skipped += 1
            continue

        applied_percentage = min(percentage, remaining_percentage)
        if applied_percentage <= 0:
            skipped += 1
            continue

        profit_amount = (investment.invested_amount * applied_percentage) / Decimal("100")
        if profit_amount <= 0:
            skipped += 1
            continue

        user_result = await db.execute(
            select(User)
            .where(User.id == investment.user_id)
            .with_for_update()
        )
        user = user_result.scalar_one_or_none()
        if not user:
            skipped += 1
            continue

        user.main_wallet += profit_amount
        investment.profit_earned += profit_amount
        investment.profit_percentage_paid += applied_percentage

        db.add(
            InvestmentProfitHistory(
                investment_id=investment.id,
                amount=profit_amount,
                percentage=applied_percentage,
                created_at=now_utc,
            )
        )

        parent_ids: list[int | None] = []
        for lvl in range(1, len(rates) + 1):
            ancestor_id = getattr(user, f"parent_lvl_{lvl}_id", None)
            parent_ids.append(ancestor_id)

        parent_result = await db.execute(
            select(User)
            .where(User.id.in_([p for p in parent_ids if p]))
            .with_for_update()
        )
        parents = {parent.id: parent for parent in parent_result.scalars().all()}

        if parents:
            for level_idx, parent_id in enumerate(parent_ids):
                if not parent_id:
                    continue
                parent = parents.get(parent_id)
                if not parent:
                    continue

                level = level_idx + 1
                rate = rates[level]
                reward = (profit_amount * rate) / Decimal("100")
                if reward <= 0:
                    continue

                if level == 1:
                    parent.referral_wallet += reward
                else:
                    parent.generation_wallet += reward

                db.add(
                    ReferralProfitHistory(
                        source_user_id=user.id,
                        receiver_user_id=parent.id,
                        investment_id=investment.id,
                        level=level,
                        percentage=rate,
                        amount=reward,
                        type="daily_roi",
                        created_at=now_utc,
                    )
                )

        if investment.profit_percentage_paid >= investment.roi_percent:
            investment.status = "completed"
            completed_now += 1

        credited += 1

    await db.commit()

    return {
        "message": "ROI applied to active investments",
        "applied_percentage": percentage,
        "processed": processed,
        "credited": credited,
        "completed_now": completed_now,
        "skipped": skipped,
        "updated_by": current_user.id,
        "updated_at": now_utc,
    }


@router.post("/apply-by-package")
@limiter.limit("30/minute")
async def save_roi_by_package(
    request: Request,
    payload: ROIPackageApply,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Save the scheduled daily ROI percentage for a single package."""
    del request, current_user

    if payload.package_name not in ALL_PACKAGE_NAMES:
        raise HTTPException(status_code=400, detail=f"Unknown package: {payload.package_name}")

    percentage = Decimal(str(payload.percentage))
    key = f"scheduled_pkg:{payload.package_name}"

    result = await db.execute(
        select(ROISetting).where(ROISetting.key == key).with_for_update()
    )
    setting = result.scalar_one_or_none()
    if setting:
        setting.roi_percent = percentage
    else:
        db.add(ROISetting(key=key, roi_percent=percentage))

    await db.commit()

    return {
        "message": f"Scheduled {percentage}% daily ROI for '{payload.package_name}' — applies at 12:00 AM UTC",
        "package_name": payload.package_name,
        "percentage": percentage,
    }


@router.get("/scheduled")
@limiter.limit("200/minute")
async def get_scheduled_roi(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Return all saved per-package daily ROI schedule settings."""
    del request, current_user

    result = await db.execute(
        select(ROISetting).where(ROISetting.key.like("scheduled_pkg:%"))
    )
    settings_list = result.scalars().all()

    scheduled = {}
    for s in settings_list:
        pkg_name = s.key[len("scheduled_pkg:"):]
        scheduled[pkg_name] = {
            "percentage": float(s.roi_percent),
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }

    return {"scheduled": scheduled}
