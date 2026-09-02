"""Task Error Detection & Disciplinary System.

Detects errors in captcha and ad view tasks, logs them, evaluates thresholds,
and applies warnings / restrictions / suspensions according to admin-configured
rules stored in `task_disciplinary_config`.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task_errors import (
    TaskAttempt,
    TaskError,
    UserWarning,
    UserRestriction,
    AccountSuspension,
    TaskDisciplinaryConfig,
)
from app.models.user import User


# ── Error codes ──────────────────────────────────────────────────────────────

# Captcha errors
ERR_CAPTCHA_INCORRECT = "captcha_incorrect"
ERR_CAPTCHA_INVALID_INPUT = "captcha_invalid_input"
ERR_CAPTCHA_TIMEOUT = "captcha_timeout"
ERR_CAPTCHA_DUPLICATE = "captcha_duplicate"
ERR_CAPTCHA_RAPID_SUBMISSION = "captcha_rapid_submission"

# Ad view errors
ERR_AD_EARLY_EXIT = "ad_early_exit"
ERR_AD_INSUFFICIENT_TIME = "ad_insufficient_time"
ERR_AD_ABNORMAL_REFRESH = "ad_abnormal_refresh"
ERR_AD_DUPLICATE_VIEW = "ad_duplicate_view"
ERR_AD_BOT_LIKE = "ad_bot_like"

ERROR_REASONS = {
    ERR_CAPTCHA_INCORRECT: "Incorrect captcha answer submitted",
    ERR_CAPTCHA_INVALID_INPUT: "Invalid captcha input format",
    ERR_CAPTCHA_TIMEOUT: "Captcha submission after expiry",
    ERR_CAPTCHA_DUPLICATE: "Duplicate captcha submission detected",
    ERR_CAPTCHA_RAPID_SUBMISSION: "Rapid successive captcha submissions",
    ERR_AD_EARLY_EXIT: "Ad view ended before required watch time",
    ERR_AD_INSUFFICIENT_TIME: "Insufficient ad watching time recorded",
    ERR_AD_ABNORMAL_REFRESH: "Abnormal page refresh during ad view",
    ERR_AD_DUPLICATE_VIEW: "Duplicate ad view detected within window",
    ERR_AD_BOT_LIKE: "Automated or bot-like ad view activity detected",
}


# ── Config helpers ───────────────────────────────────────────────────────────

async def _get_config(db: AsyncSession, key: str, default: str = "0") -> str:
    result = await db.execute(
        select(TaskDisciplinaryConfig).where(TaskDisciplinaryConfig.key == key)
    )
    row = result.scalar_one_or_none()
    if row and row.value is not None:
        return row.value
    return default


async def _get_config_int(db: AsyncSession, key: str, default: int = 0) -> int:
    val = await _get_config(db, key, str(default))
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


# ── Error logging ────────────────────────────────────────────────────────────

async def log_task_attempt(
    db: AsyncSession,
    user_id: int,
    task_type: str,
    status: str = "completed",
    reference_id: int | None = None,
    reference_type: str | None = None,
    error_code: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> TaskAttempt:
    """Record a task attempt. Returns the created TaskAttempt."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    count_result = await db.execute(
        select(func.count(TaskAttempt.id)).where(
            and_(
                TaskAttempt.user_id == user_id,
                TaskAttempt.task_type == task_type,
                TaskAttempt.created_at >= today_start,
            )
        )
    )
    attempt_number = (count_result.scalar() or 0) + 1

    attempt = TaskAttempt(
        user_id=user_id,
        task_type=task_type,
        status=status,
        reference_id=reference_id,
        reference_type=reference_type,
        error_code=error_code,
        error_reason=ERROR_REASONS.get(error_code) if error_code else None,
        attempt_number=attempt_number,
        ip_address=ip_address,
        user_agent=user_agent,
        system_action="none",
    )
    db.add(attempt)
    await db.flush()
    return attempt


async def log_task_error(
    db: AsyncSession,
    user_id: int,
    task_type: str,
    error_code: str,
    task_attempt_id: int | None = None,
    attempt_number: int = 1,
) -> TaskError:
    """Record a task error and evaluate disciplinary thresholds."""
    error_reason = ERROR_REASONS.get(error_code, f"Unknown error: {error_code}")

    task_error = TaskError(
        user_id=user_id,
        task_type=task_type,
        error_code=error_code,
        error_reason=error_reason,
        task_attempt_id=task_attempt_id,
        attempt_number=attempt_number,
        system_action="none",
        review_status="pending",
    )
    db.add(task_error)
    await db.flush()

    system_action = await _evaluate_thresholds(db, user_id, task_type, task_error)
    task_error.system_action = system_action

    if task_attempt_id:
        attempt = await db.get(TaskAttempt, task_attempt_id)
        if attempt:
            attempt.system_action = system_action

    await db.flush()
    return task_error


# ── Threshold evaluation ─────────────────────────────────────────────────────

async def _count_recent_errors(
    db: AsyncSession,
    user_id: int,
    task_type: str | None = None,
) -> int:
    expiry_days = await _get_config_int(db, "error_expiry_days", 30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=expiry_days)

    conditions = [
        TaskError.user_id == user_id,
        TaskError.created_at >= cutoff,
    ]
    if task_type:
        conditions.append(TaskError.task_type == task_type)

    result = await db.execute(
        select(func.count(TaskError.id)).where(and_(*conditions))
    )
    return result.scalar() or 0


async def _evaluate_thresholds(
    db: AsyncSession,
    user_id: int,
    task_type: str,
    task_error: TaskError,
) -> str:
    """Evaluate error thresholds and apply appropriate disciplinary action.

    Returns the system_action string applied.
    """
    total_errors = await _count_recent_errors(db, user_id)
    task_errors = await _count_recent_errors(db, user_id, task_type)

    warning_threshold = await _get_config_int(db, "warning_threshold", 3)
    restriction_threshold = await _get_config_int(db, "restriction_threshold", 6)
    suspension_threshold = await _get_config_int(db, "suspension_threshold", 10)

    has_active_suspension = await _has_active_suspension(db, user_id)
    if has_active_suspension:
        return "none"

    has_active_restriction = await _has_active_restriction(db, user_id)
    has_active_warning = await _has_active_warning(db, user_id)

    if total_errors >= suspension_threshold and not has_active_suspension:
        await _apply_suspension(db, user_id, task_type, total_errors, task_error)
        return "suspension"

    if total_errors >= restriction_threshold and not has_active_restriction and not has_active_suspension:
        await _apply_restriction(db, user_id, task_type, total_errors, task_error)
        return "restriction"

    if total_errors >= warning_threshold and not has_active_warning and not has_active_restriction and not has_active_suspension:
        await _apply_warning(db, user_id, task_type, total_errors, task_error)
        return "warning"

    return "none"


async def _has_active_suspension(db: AsyncSession, user_id: int) -> bool:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(func.count(AccountSuspension.id)).where(
            and_(
                AccountSuspension.user_id == user_id,
                AccountSuspension.status == "active",
                or_(
                    AccountSuspension.expires_at.is_(None),
                    AccountSuspension.expires_at > now,
                ),
            )
        )
    )
    return (result.scalar() or 0) > 0


async def _has_active_restriction(db: AsyncSession, user_id: int) -> bool:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(func.count(UserRestriction.id)).where(
            and_(
                UserRestriction.user_id == user_id,
                UserRestriction.is_active == True,
                or_(
                    UserRestriction.expires_at.is_(None),
                    UserRestriction.expires_at > now,
                ),
            )
        )
    )
    return (result.scalar() or 0) > 0


async def _has_active_warning(db: AsyncSession, user_id: int) -> bool:
    result = await db.execute(
        select(func.count(UserWarning.id)).where(
            and_(
                UserWarning.user_id == user_id,
                UserWarning.is_active == True,
            )
        )
    )
    return (result.scalar() or 0) > 0


# ── Apply disciplinary actions ───────────────────────────────────────────────

async def _apply_warning(
    db: AsyncSession,
    user_id: int,
    task_type: str,
    error_count: int,
    task_error: TaskError,
):
    warning = UserWarning(
        user_id=user_id,
        warning_type="task_error_threshold",
        reason=f"You have received a task warning due to repeated task errors ({error_count} errors). Please complete future tasks carefully.",
        error_count_at_warning=error_count,
        task_type=task_type,
        issued_by="system",
        is_active=True,
    )
    db.add(warning)
    await db.flush()


async def _apply_restriction(
    db: AsyncSession,
    user_id: int,
    task_type: str,
    error_count: int,
    task_error: TaskError,
):
    restriction = UserRestriction(
        user_id=user_id,
        restriction_type="daily_task_blocked",
        reason=f"Your daily task access has been temporarily restricted due to repeated task violations ({error_count} errors).",
        error_count_at_restriction=error_count,
        task_type=task_type,
        is_active=True,
        issued_by="system",
    )
    db.add(restriction)
    await db.flush()


async def _apply_suspension(
    db: AsyncSession,
    user_id: int,
    task_type: str,
    error_count: int,
    task_error: TaskError,
):
    duration_hours = await _get_config_int(db, "suspension_duration_hours", 24)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=duration_hours)

    suspension = AccountSuspension(
        user_id=user_id,
        suspension_type="task_only_block",
        reason=f"Your account has been suspended due to repeated task violations ({error_count} errors). Please contact the OFA KYC Support Team or wait until your account review is completed.",
        triggering_error_id=task_error.id,
        error_count_at_suspension=error_count,
        status="active",
        duration_hours=duration_hours,
        suspended_at=now,
        expires_at=expires_at,
        suspended_by="system",
    )
    db.add(suspension)
    await db.flush()

    user = await db.get(User, user_id)
    if user:
        user.account_status = "on_hold"
        user.account_issue = f"Account suspended for {duration_hours}h due to task violations"
        await db.flush()


# ── Check access ─────────────────────────────────────────────────────────────

async def check_task_access(db: AsyncSession, user_id: int) -> dict:
    """Check if user can perform daily tasks. Returns access info."""
    now = datetime.now(timezone.utc)

    suspension_result = await db.execute(
        select(AccountSuspension).where(
            and_(
                AccountSuspension.user_id == user_id,
                AccountSuspension.status == "active",
                or_(
                    AccountSuspension.expires_at.is_(None),
                    AccountSuspension.expires_at > now,
                ),
            )
        ).order_by(AccountSuspension.suspended_at.desc()).limit(1)
    )
    active_suspension = suspension_result.scalar_one_or_none()
    if active_suspension:
        return {
            "allowed": False,
            "reason": active_suspension.reason,
            "status": "suspended",
            "expires_at": active_suspension.expires_at.isoformat() if active_suspension.expires_at else None,
            "suspension_type": active_suspension.suspension_type,
        }

    restriction_result = await db.execute(
        select(UserRestriction).where(
            and_(
                UserRestriction.user_id == user_id,
                UserRestriction.is_active == True,
                or_(
                    UserRestriction.expires_at.is_(None),
                    UserRestriction.expires_at > now,
                ),
            )
        ).order_by(UserRestriction.created_at.desc()).limit(1)
    )
    active_restriction = restriction_result.scalar_one_or_none()
    if active_restriction:
        return {
            "allowed": False,
            "reason": active_restriction.reason,
            "status": "restricted",
        }

    warning_result = await db.execute(
        select(UserWarning).where(
            and_(
                UserWarning.user_id == user_id,
                UserWarning.is_active == True,
            )
        ).order_by(UserWarning.created_at.desc()).limit(1)
    )
    active_warning = warning_result.scalar_one_or_none()
    if active_warning:
        return {
            "allowed": True,
            "warning": active_warning.reason,
            "status": "warning",
        }

    return {"allowed": True, "status": "active"}


# ── Auto-expire suspensions ─────────────────────────────────────────────────

async def expire_stale_suspensions(db: AsyncSession):
    """Lift suspensions whose expiry has passed."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
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
    if result.rowcount > 0:
        suspended_user_ids = (
            await db.execute(
                select(AccountSuspension.user_id).where(
                    and_(
                        AccountSuspension.status == "expired",
                        AccountSuspension.lifted_at == now,
                    )
                )
            )
        ).scalars().all()
        for uid in suspended_user_ids:
            has_other_active = await _has_active_suspension(db, uid)
            if not has_other_active:
                user = await db.get(User, uid)
                if user and user.account_status == "on_hold":
                    user.account_status = "active"
                    user.account_issue = None
        await db.flush()
