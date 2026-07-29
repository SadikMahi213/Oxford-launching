import asyncio
import logging
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.referral import get_referral_level_rates
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.investments import Investment
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.roi_setting import ROISetting
from app.models.system_config import SystemConfig
from app.models.user import User

logger = logging.getLogger(__name__)

WALLET_PRECISION = Decimal("0.00000000000001")
PERCENT_PRECISION = Decimal("0.0001")

_auto_roi_task: asyncio.Task | None = None


def _to_wallet_precision(amount: Decimal) -> Decimal:
    return amount.quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)


def _to_percent_precision(amount: Decimal) -> Decimal:
    return amount.quantize(PERCENT_PRECISION, rounding=ROUND_HALF_UP)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _calculate_due_percentage(investment: Investment, now_utc: datetime) -> Decimal:
    start_date = _as_utc(investment.start_date)
    end_date = _as_utc(investment.end_date)

    if investment.profit_percentage_paid >= investment.roi_percent:
        return Decimal("0")

    total_duration_days = max(
        1,
        int((end_date - start_date).total_seconds() // 86400),
    )

    elapsed_days = max(
        0,
        int((now_utc - start_date).total_seconds() // 86400),
    )

    if now_utc >= end_date:
        target_percentage = investment.roi_percent
    else:
        daily_percentage = investment.roi_percent / Decimal(total_duration_days)
        target_percentage = daily_percentage * Decimal(elapsed_days)

    target_percentage = min(investment.roi_percent, target_percentage)
    target_percentage = _to_percent_precision(target_percentage)

    due = target_percentage - investment.profit_percentage_paid
    if due <= 0:
        return Decimal("0")

    remaining = investment.roi_percent - investment.profit_percentage_paid
    due = min(due, remaining)

    return _to_percent_precision(due)


async def _apply_referral_cascade(
    db,
    source_user: User,
    investment_id: int,
    profit_amount: Decimal,
    now_utc: datetime,
) -> None:
    parent_ids = [
        source_user.parent_lvl_1_id,
        source_user.parent_lvl_2_id,
        source_user.parent_lvl_3_id,
        source_user.parent_lvl_4_id,
        source_user.parent_lvl_5_id,
    ]

    active_parent_ids = set()
    parent_rows_result = await db.execute(
        select(User)
        .where(User.id.in_([p for p in parent_ids if p]))
        .with_for_update()
    )
    parents_map = {parent.id: parent for parent in parent_rows_result.scalars().all()}

    if not parents_map:
        return

    # Only credit parents who have at least one active package
    active_result = await db.execute(
        select(Investment.user_id)
        .where(Investment.user_id.in_([p for p in parent_ids if p]), Investment.status == "active")
        .distinct()
    )
    active_parent_ids = set(active_result.scalars().all())

    rates = await get_referral_level_rates(db)

    for level_idx, parent_id in enumerate(parent_ids):
        if not parent_id:
            continue
        parent = parents_map.get(parent_id)
        if not parent:
            continue

        level = level_idx + 1
        rate = rates[level]
        reward = _to_wallet_precision((profit_amount * rate) / Decimal("100"))

        if reward <= 0:
            continue

        if parent_id in active_parent_ids:
            if level == 1:
                parent.referral_wallet = _to_wallet_precision(
                    parent.referral_wallet + reward
                )
            else:
                parent.generation_wallet = _to_wallet_precision(
                    parent.generation_wallet + reward
                )

            db.add(
                ReferralProfitHistory(
                    source_user_id=source_user.id,
                    receiver_user_id=parent.id,
                    investment_id=investment_id,
                    level=level,
                    percentage=rate,
                    amount=reward,
                    type="daily_roi",
                    created_at=now_utc,
                )
                            )


async def _process_investment(investment_id: int, now_utc: datetime) -> bool:
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Investment)
                .where(Investment.id == investment_id)
                .with_for_update()
            )
            investment = result.scalar_one_or_none()

            if not investment or investment.status != "active":
                await db.rollback()
                return False

            due_percentage = _calculate_due_percentage(investment, now_utc)
            if due_percentage <= 0:
                await db.rollback()
                return False

            profit_amount = _to_wallet_precision(
                (investment.invested_amount * due_percentage) / Decimal("100")
            )
            if profit_amount <= 0:
                await db.rollback()
                return False

            user_result = await db.execute(
                select(User)
                .where(User.id == investment.user_id)
                .with_for_update()
            )
            user = user_result.scalar_one_or_none()
            if not user:
                await db.rollback()
                return False

            user.main_wallet = _to_wallet_precision(user.main_wallet + profit_amount)
            investment.profit_earned = _to_wallet_precision(
                investment.profit_earned + profit_amount
            )
            investment.profit_percentage_paid = _to_percent_precision(
                investment.profit_percentage_paid + due_percentage
            )

            db.add(
                InvestmentProfitHistory(
                    investment_id=investment.id,
                    amount=profit_amount,
                    percentage=due_percentage,
                    created_at=now_utc,
                )
            )

            await _apply_referral_cascade(
                db=db,
                source_user=user,
                investment_id=investment.id,
                profit_amount=profit_amount,
                now_utc=now_utc,
            )

            if investment.profit_percentage_paid >= investment.roi_percent:
                investment.status = "completed"

            await db.commit()
            return True
        except Exception:
            await db.rollback()
            logger.exception(
                "Auto ROI processing failed for investment_id=%s",
                investment_id,
            )
            return False


async def _process_investment_scheduled(investment_id: int, daily_payment: Decimal, now_utc: datetime) -> bool:
    """Apply a fixed daily payment amount to one investment (scheduled mode)."""
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Investment)
                .where(Investment.id == investment_id)
                .with_for_update()
            )
            investment = result.scalar_one_or_none()

            if not investment or investment.status != "active":
                await db.rollback()
                return False

            # Skip if ROI was already credited today (UTC)
            today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
            tomorrow_start = today_start + timedelta(days=1)
            already_result = await db.execute(
                select(InvestmentProfitHistory.id)
                .where(
                    InvestmentProfitHistory.investment_id == investment_id,
                    InvestmentProfitHistory.created_at >= today_start,
                    InvestmentProfitHistory.created_at < tomorrow_start,
                )
                .limit(1)
            )
            if already_result.scalar_one_or_none() is not None:
                await db.rollback()
                return False

            # Check if investment is already completed
            remaining_profit = _to_wallet_precision(
                investment.expected_profit - investment.profit_earned
            )
            if remaining_profit <= 0:
                if investment.status != "completed":
                    investment.status = "completed"
                    await db.commit()
                else:
                    await db.rollback()
                return False

            # Use the fixed daily payment, capped by remaining profit
            profit_amount = _to_wallet_precision(min(daily_payment, remaining_profit))
            if profit_amount <= 0:
                await db.rollback()
                return False

            # Calculate the percentage equivalent for history tracking
            applied_percentage = _to_percent_precision(
                (profit_amount / investment.invested_amount) * Decimal("100")
            )

            user_result = await db.execute(
                select(User).where(User.id == investment.user_id).with_for_update()
            )
            user = user_result.scalar_one_or_none()
            if not user:
                await db.rollback()
                return False

            user.main_wallet = _to_wallet_precision(user.main_wallet + profit_amount)
            investment.profit_earned = _to_wallet_precision(
                investment.profit_earned + profit_amount
            )
            investment.profit_percentage_paid = _to_percent_precision(
                investment.profit_percentage_paid + applied_percentage
            )
            db.add(
                InvestmentProfitHistory(
                    investment_id=investment.id,
                    amount=profit_amount,
                    percentage=applied_percentage,
                    created_at=now_utc,
                )
            )
            await _apply_referral_cascade(
                db=db,
                source_user=user,
                investment_id=investment.id,
                profit_amount=profit_amount,
                now_utc=now_utc,
            )

            # Complete if total profit earned meets or exceeds expected profit
            if investment.profit_earned >= investment.expected_profit:
                investment.status = "completed"

            await db.commit()
            return True
        except Exception:
            await db.rollback()
            logger.exception("Scheduled ROI failed for investment_id=%s", investment_id)
            return False


async def run_auto_roi_cycle() -> dict:
    """Credit each active investment with its fixed daily payment once per day."""
    now_utc = datetime.now(timezone.utc)

    # Check UK weekend / admin override for daily_earning
    async with AsyncSessionLocal() as db:
        from app.utils.is_system_active import is_system_active
        if not await is_system_active("daily_earning", db):
            logger.info("Auto ROI: daily earning is paused (weekend/system maintenance), skipping cycle")
            return {"processed": 0, "credited": 0}

    # Fetch all active investment IDs and their daily payments
    async with AsyncSessionLocal() as db:
        ids_result = await db.execute(
            select(Investment.id, Investment.daily_payment, Investment.invested_amount)
            .where(Investment.status == "active")
        )
        investment_rows = list(ids_result.all())

    processed = 0
    credited = 0

    for investment_id, daily_payment, invested_amount in investment_rows:
        if not daily_payment or daily_payment <= 0:
            continue
        if invested_amount <= 0:  # Free package - no ROI to process, keep active
            continue
        processed += 1
        if await _process_investment_scheduled(investment_id, daily_payment, now_utc):
            credited += 1

    return {"processed": processed, "credited": credited}


async def _auto_roi_loop() -> None:
    logger.info("Auto ROI scheduler started — will fire once daily at 00:00 UTC")

    while True:
        now = datetime.now(timezone.utc)
        # Sleep until next midnight UTC
        tomorrow_midnight = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        sleep_seconds = (tomorrow_midnight - now).total_seconds()
        logger.info(
            "Auto ROI: sleeping %.0fs until %s UTC",
            sleep_seconds,
            tomorrow_midnight.isoformat(),
        )
        await asyncio.sleep(sleep_seconds)

        cycle_start = datetime.now(timezone.utc)
        try:
            summary = await run_auto_roi_cycle()
            logger.info(
                "Auto ROI daily cycle done processed=%s credited=%s at=%s",
                summary["processed"],
                summary["credited"],
                cycle_start.isoformat(),
            )
        except Exception:
            logger.exception("Auto ROI daily cycle crashed")


async def start_auto_roi_scheduler() -> None:
    global _auto_roi_task

    if not settings.AUTO_ROI_ENABLED:
        logger.info("Auto ROI scheduler disabled by config")
        return

    if _auto_roi_task and not _auto_roi_task.done():
        logger.info("Auto ROI scheduler already running")
        return

    _auto_roi_task = asyncio.create_task(
        _auto_roi_loop(),
        name="auto-roi-scheduler",
    )
    logger.info("Auto ROI scheduler started")


async def stop_auto_roi_scheduler() -> None:
    global _auto_roi_task

    if not _auto_roi_task:
        return

    _auto_roi_task.cancel()
    with suppress(asyncio.CancelledError):
        await _auto_roi_task
    _auto_roi_task = None
    logger.info("Auto ROI scheduler stopped")
