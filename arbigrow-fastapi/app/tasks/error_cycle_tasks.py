"""Periodic tasks for error cycle and suspension expiry processing."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.celery_app import celery_app
from app.core.config import settings
from app.models.task_errors import AccountSuspension

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.error_cycle_tasks.process_account_expiry")
def process_account_expiry():
    """Process automatic expiry of holds and suspensions.

    Runs every 5 minutes via Celery beat.
    """
    import asyncio
    asyncio.run(_process_account_expiry_async())


async def _process_account_expiry_async():
    """Async implementation of account expiry processing."""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        from app.services.task_error_service import (
            _get_config_int,
            STATUS_SUSPENDED,
            STATUS_PERMANENTLY_CLOSED,
            STATUS_ACTIVE,
            get_config_message,
        )
        from app.models.user import User

        now = datetime.now(timezone.utc)

        # ── Process suspended users past communication deadline ────
        comm_deadline_days = await _get_config_int(db, "communication_deadline_days", 7)

        susp_result = await db.execute(
            select(User).where(
                and_(
                    User.account_status == STATUS_SUSPENDED,
                    User.suspension_until.isnot(None),
                    User.suspension_until <= now,
                )
            )
        )
        for user in susp_result.scalars().all():
            deadline = user.suspended_at + timedelta(days=comm_deadline_days) if user.suspended_at else None
            if deadline and now >= deadline and not user.company_contact_status:
                user.account_status = STATUS_PERMANENTLY_CLOSED
                user.permanent_closed_at = now
                closure_msg = await get_config_message(db, "permanent_closure_message")
                user.account_issue = closure_msg or "Your account has been permanently closed according to the company policy."
                logger.info(f"User {user.id} permanently closed: no contact within deadline")
            else:
                user.account_status = STATUS_ACTIVE
                user.account_issue = None
                user.suspended_at = None
                user.suspension_until = None
                logger.info(f"User {user.id} suspension expired, restored to active")

        # ── Expire holds ──────────────────────────────────────────
        hold_result = await db.execute(
            select(User).where(
                and_(
                    User.account_status == "on_hold",
                    User.hold_until.isnot(None),
                    User.hold_until <= now,
                )
            )
        )
        for user in hold_result.scalars().all():
            user.account_status = STATUS_ACTIVE
            user.account_issue = None
            user.hold_until = None
            logger.info(f"User {user.id} hold expired, restored to active")

        # ── Expire old AccountSuspension records ──────────────────
        await db.execute(
            update(AccountSuspension)
            .where(
                and_(
                    AccountSuspension.status == "active",
                    AccountSuspension.expires_at.isnot(None),
                    AccountSuspension.expires_at <= now,
                )
            )
            .values(status="expired", lifted_at=now)
        )

        await db.commit()
        logger.info("Account expiry processing completed")

    await engine.dispose()
