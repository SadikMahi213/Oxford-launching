"""
Invoice Scheduler — auto-generates periodic summary invoices (daily, weekly, monthly).
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.database import async_session_factory
from app.models.user import User
from app.models.deposit import Deposit
from app.models.withdrawal import Withdrawal
from app.services.invoice_service import generate_user_invoice

logger = logging.getLogger(__name__)

_invoice_scheduler_task: asyncio.Task | None = None


async def start_invoice_scheduler():
    """Start the background invoice scheduler."""
    global _invoice_scheduler_task
    if _invoice_scheduler_task is not None:
        return

    async def _run():
        while True:
            try:
                now = datetime.now(timezone.utc)
                # Run daily at 01:00 UTC
                if now.hour == 1 and now.minute < 5:
                    logger.info("Invoice scheduler: generating daily summaries...")
                    await generate_daily_invoices(now)

                # Run weekly on Monday 01:00 UTC
                if now.weekday() == 0 and now.hour == 1 and now.minute < 5:
                    logger.info("Invoice scheduler: generating weekly summaries...")
                    await generate_weekly_invoices(now)

                # Run monthly on 1st at 01:00 UTC
                if now.day == 1 and now.hour == 1 and now.minute < 5:
                    logger.info("Invoice scheduler: generating monthly summaries...")
                    await generate_monthly_invoices(now)
            except Exception as e:
                logger.error(f"Invoice scheduler error: {e}", exc_info=True)

            await asyncio.sleep(300)  # Check every 5 minutes

    _invoice_scheduler_task = asyncio.create_task(_run())
    logger.info("Invoice scheduler started (checking every 5 minutes)")


async def stop_invoice_scheduler():
    """Stop the background invoice scheduler."""
    global _invoice_scheduler_task
    if _invoice_scheduler_task is not None:
        _invoice_scheduler_task.cancel()
        _invoice_scheduler_task = None
        logger.info("Invoice scheduler stopped")


# ── Period Generators ─────────────────────────────────────────────────────


async def generate_daily_invoices(ref_date: datetime) -> dict:
    """
    Generate a daily summary invoice for every user who had
    deposit or withdrawal activity on the given day.
    """
    day_start = ref_date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(hours=23, minutes=59, seconds=59)

    async with async_session_factory() as db:
        # Find users with activity
        dep_users = await db.execute(
            select(Deposit.user_id).where(
                Deposit.created_at >= day_start,
                Deposit.created_at <= day_end,
            ).distinct()
        )
        wdw_users = await db.execute(
            select(Withdrawal.user_id).where(
                Withdrawal.created_at >= day_start,
                Withdrawal.created_at <= day_end,
            ).distinct()
        )
        user_ids = set(
            list(dep_users.scalars().all()) + list(wdw_users.scalars().all())
        )

        generated = 0
        for uid in user_ids:
            try:
                user_result = await db.execute(select(User).where(User.id == uid))
                user = user_result.scalar_one_or_none()
                if not user:
                    continue

                await generate_user_invoice(
                    db=db,
                    user=user,
                    invoice_type="daily",
                    currency="USDT",
                    description=f"Daily Summary — {day_start.strftime('%b %d, %Y')}",
                    period_start=day_start,
                    period_end=day_end,
                )
                generated += 1
            except Exception:
                logger.exception("Failed to generate daily invoice for user_id=%s", uid)

        await db.commit()
        logger.info("Generated %d daily invoices", generated)
        return {"generated": generated}


async def generate_weekly_invoices(week_end: datetime) -> dict:
    """Generate a weekly summary invoice for each user with activity in the past 7 days."""
    week_start = week_end - timedelta(days=7)

    async with async_session_factory() as db:
        dep_users = await db.execute(
            select(Deposit.user_id).where(
                Deposit.created_at >= week_start,
            ).distinct()
        )
        wdw_users = await db.execute(
            select(Withdrawal.user_id).where(
                Withdrawal.created_at >= week_start,
            ).distinct()
        )
        user_ids = set(
            list(dep_users.scalars().all()) + list(wdw_users.scalars().all())
        )

        generated = 0
        for uid in user_ids:
            try:
                user_result = await db.execute(select(User).where(User.id == uid))
                user = user_result.scalar_one_or_none()
                if not user:
                    continue

                await generate_user_invoice(
                    db=db,
                    user=user,
                    invoice_type="weekly",
                    currency="USDT",
                    description=f"Weekly Summary — {week_start.strftime('%b %d')} to {week_end.strftime('%b %d, %Y')}",
                    period_start=week_start,
                    period_end=week_end,
                )
                generated += 1
            except Exception:
                logger.exception("Failed to generate weekly invoice for user_id=%s", uid)

        await db.commit()
        logger.info("Generated %d weekly invoices", generated)
        return {"generated": generated}


async def generate_monthly_invoices(month_end: datetime) -> dict:
    """Generate a monthly summary invoice for each user with activity in the month."""
    month_start = (month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                   - timedelta(days=1)).replace(day=1)

    async with async_session_factory() as db:
        dep_users = await db.execute(
            select(Deposit.user_id).where(
                Deposit.created_at >= month_start,
                Deposit.created_at <= month_end,
            ).distinct()
        )
        wdw_users = await db.execute(
            select(Withdrawal.user_id).where(
                Withdrawal.created_at >= month_start,
                Withdrawal.created_at <= month_end,
            ).distinct()
        )
        user_ids = set(
            list(dep_users.scalars().all()) + list(wdw_users.scalars().all())
        )

        generated = 0
        for uid in user_ids:
            try:
                user_result = await db.execute(select(User).where(User.id == uid))
                user = user_result.scalar_one_or_none()
                if not user:
                    continue

                await generate_user_invoice(
                    db=db,
                    user=user,
                    invoice_type="monthly",
                    currency="USDT",
                    description=f"Monthly Summary — {month_start.strftime('%B %Y')}",
                    period_start=month_start,
                    period_end=month_end,
                )
                generated += 1
            except Exception:
                logger.exception("Failed to generate monthly invoice for user_id=%s", uid)

        await db.commit()
        logger.info("Generated %d monthly invoices", generated)
        return {"generated": generated}
