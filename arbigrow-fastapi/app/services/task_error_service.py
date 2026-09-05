"""Task Error Detection & Disciplinary System (Cycle-Based).

Implements error cycle tracking, account hold, suspension, and permanent closure
with configurable thresholds and durations.

Cycle Logic:
- Errors accumulate within a configurable cycle (default 24h)
- When cycle expires, error_count and hold_count reset to 0
- Hold: max 1 per cycle, configurable duration
- Suspension: overrides hold, configurable duration
- Permanent closure: after suspension deadline if no company contact
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

ERR_CAPTCHA_INCORRECT = "captcha_incorrect"
ERR_CAPTCHA_INVALID_INPUT = "captcha_invalid_input"
ERR_CAPTCHA_TIMEOUT = "captcha_timeout"
ERR_CAPTCHA_DUPLICATE = "captcha_duplicate"
ERR_CAPTCHA_RAPID_SUBMISSION = "captcha_rapid_submission"

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


# ── Account status constants ─────────────────────────────────────────────────
STATUS_ACTIVE = "active"
STATUS_ON_HOLD = "on_hold"
STATUS_SUSPENDED = "suspended"
STATUS_PERMANENTLY_CLOSED = "permanently_closed"

# Status priority (higher index = stronger)
STATUS_PRIORITY = {
    STATUS_ACTIVE: 0,
    STATUS_ON_HOLD: 1,
    STATUS_SUSPENDED: 2,
    STATUS_PERMANENTLY_CLOSED: 3,
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


async def _get_config_float(db: AsyncSession, key: str, default: float = 0.0) -> float:
    val = await _get_config(db, key, str(default))
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


async def get_config_message(db: AsyncSession, key: str, **kwargs) -> str:
    """Get a config message and format it with kwargs."""
    template = await _get_config(db, key, "")
    try:
        return template.format(**kwargs)
    except (KeyError, ValueError):
        return template


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
    """Record a task attempt."""
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

    # Lock user row for atomic cycle + threshold evaluation
    user_result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise ValueError(f"User {user_id} not found")

    now = datetime.now(timezone.utc)

    # ── Phase 4: Error Cycle Logic ────────────────────────────────
    cycle_duration_hours = await _get_config_int(db, "error_cycle_duration_hours", 24)
    cycle_duration = timedelta(hours=cycle_duration_hours)

    cycle_expired = (
        user.error_cycle_end is not None
        and now >= user.error_cycle_end
    )

    if user.error_cycle_start is None or cycle_expired:
        # Start a new cycle
        user.error_count = 0
        user.hold_count = 0
        user.error_cycle_start = now
        user.error_cycle_end = now + cycle_duration

    # ── Phase 6: Hold Expiry ──────────────────────────────────────
    if (
        user.account_status == STATUS_ON_HOLD
        and user.hold_until is not None
        and now >= user.hold_until
        and user.suspended_at is None or (
            user.suspension_until is not None and now >= user.suspension_until
        )
    ):
        # Hold expired - check if suspension also expired
        if user.account_status == STATUS_SUSPENDED and user.suspension_until and now >= user.suspension_until:
            # Suspension expired too - check communication deadline
            user.account_status = STATUS_ACTIVE
            user.account_issue = None
            user.hold_until = None
            user.suspended_at = None
            user.suspension_until = None
        elif user.account_status == STATUS_ON_HOLD and user.hold_until and now >= user.hold_until:
            # Only hold expired
            user.account_status = STATUS_ACTIVE
            user.account_issue = None
            user.hold_until = None

    # ── Increment error count ─────────────────────────────────────
    user.error_count += 1
    current_count = user.error_count

    # ── Create error record with cycle context ────────────────────
    task_error = TaskError(
        user_id=user_id,
        task_type=task_type,
        error_code=error_code,
        error_reason=error_reason,
        task_attempt_id=task_attempt_id,
        attempt_number=attempt_number,
        system_action="none",
        review_status="pending",
        error_count_at_time=current_count,
        cycle_start=user.error_cycle_start,
        cycle_end=user.error_cycle_end,
        action_taken="none",
    )
    db.add(task_error)
    await db.flush()

    # ── Phase 5-9: Evaluate thresholds ────────────────────────────
    system_action = await _evaluate_thresholds(db, user, task_error, now)
    task_error.action_taken = system_action
    task_error.system_action = system_action

    if task_attempt_id:
        attempt = await db.get(TaskAttempt, task_attempt_id)
        if attempt:
            attempt.system_action = system_action

    await db.flush()
    return task_error


# ── Threshold evaluation ─────────────────────────────────────────────────────

async def _evaluate_thresholds(
    db: AsyncSession,
    user: User,
    task_error: TaskError,
    now: datetime,
) -> str:
    """Evaluate error thresholds and apply disciplinary action.

    Returns the action_taken string applied.
    Priority: PERMANENTLY_CLOSED > SUSPENDED > ON_HOLD > ACTIVE

    A threshold of 0 (or below) disables that action.
    Hold fires exactly when the cumulative count reaches the hold
    threshold (threshold crossing), so it never repeats on later
    errors; suspension (>=) always takes priority over hold.
    """
    # ── Status priority: never downgrade ──────────────────────────
    if user.account_status == STATUS_PERMANENTLY_CLOSED:
        return "none"

    # ── Phase 8: Suspension Logic (highest priority) ──────────────
    suspension_threshold = await _get_config_int(db, "suspension_threshold", 5)
    if (
        suspension_threshold > 0
        and user.error_count >= suspension_threshold
        and user.account_status != STATUS_SUSPENDED
    ):
        await _apply_suspension(db, user, task_error, now)
        return "suspension"

    # ── Phase 5: Account Hold Logic ───────────────────────────────
    # Fires only on the exact crossing (prev < threshold <= new) so a
    # later error (e.g. 4 after a hold at 3) never triggers another hold.
    hold_threshold = await _get_config_int(db, "hold_threshold", 3)
    max_hold_per_cycle = await _get_config_int(db, "max_hold_per_cycle", 1)

    if (
        hold_threshold > 0
        and user.error_count == hold_threshold
        and user.hold_count < max_hold_per_cycle
        and user.account_status == STATUS_ACTIVE
    ):
        await _apply_hold(db, user, task_error, now)
        return "hold"

    # ── Warning (always issued on first error thresholds) ─────────
    # Check if we've crossed any warning threshold but not hold yet
    if user.error_count < hold_threshold:
        # Issue a warning for every error below hold threshold
        await _apply_warning(db, user, task_error, now)
        return "warning"

    return "none"


# ── Apply disciplinary actions ───────────────────────────────────────────────

async def _apply_warning(
    db: AsyncSession,
    user: User,
    task_error: TaskError,
    now: datetime,
):
    hold_threshold = await _get_config_int(db, "hold_threshold", 3)
    warning_msg = await get_config_message(
        db, "warning_message",
        error_count=user.error_count,
        hold_threshold=hold_threshold,
    )

    warning = UserWarning(
        user_id=user.id,
        warning_type="task_error_threshold",
        reason=warning_msg or f"You have received a valid task error. Current error count: {user.error_count} of {hold_threshold} before account hold.",
        error_count_at_warning=user.error_count,
        task_type=task_error.task_type,
        issued_by="system",
        is_active=True,
    )
    db.add(warning)
    await db.flush()


async def _apply_hold(
    db: AsyncSession,
    user: User,
    task_error: TaskError,
    now: datetime,
):
    hold_duration_hours = await _get_config_float(db, "hold_duration_hours", 2)
    hold_until = now + timedelta(hours=hold_duration_hours)

    hold_msg = await get_config_message(
        db, "hold_message",
        hold_until=hold_until.strftime("%Y-%m-%d %H:%M UTC"),
        error_count=user.error_count,
    )

    # Update user state (already locked via with_for_update)
    user.account_status = STATUS_ON_HOLD
    user.account_issue = hold_msg or f"Account on hold until {hold_until.strftime('%Y-%m-%d %H:%M UTC')} due to task errors"
    user.hold_count += 1
    user.last_hold_at = now
    user.hold_until = hold_until

    # Create restriction record for backward compatibility
    restriction = UserRestriction(
        user_id=user.id,
        restriction_type="daily_task_blocked",
        reason=hold_msg or f"Account on hold for {hold_duration_hours}h due to task errors",
        error_count_at_restriction=user.error_count,
        task_type=task_error.task_type,
        is_active=True,
        expires_at=hold_until,
        issued_by="system",
    )
    db.add(restriction)

    # Create suspension record for backward compatibility (hold = short suspension)
    suspension = AccountSuspension(
        user_id=user.id,
        suspension_type="task_only_block",
        reason=hold_msg or f"Account on hold for {hold_duration_hours}h due to task errors",
        triggering_error_id=task_error.id,
        error_count_at_suspension=user.error_count,
        status="active",
        duration_hours=int(hold_duration_hours),
        suspended_at=now,
        expires_at=hold_until,
        suspended_by="system",
    )
    db.add(suspension)
    await db.flush()


async def _apply_suspension(
    db: AsyncSession,
    user: User,
    task_error: TaskError,
    now: datetime,
):
    suspension_duration_hours = await _get_config_int(db, "suspension_duration_hours", 168)
    suspension_until = now + timedelta(hours=suspension_duration_hours)

    susp_msg = await get_config_message(
        db, "suspension_message",
        suspension_until=suspension_until.strftime("%Y-%m-%d %H:%M UTC"),
        error_count=user.error_count,
    )

    # Update user state (already locked)
    user.account_status = STATUS_SUSPENDED
    user.account_issue = susp_msg or f"Account suspended until {suspension_until.strftime('%Y-%m-%d %H:%M UTC')} due to task errors"
    user.suspended_at = now
    user.suspension_until = suspension_until
    user.suspension_count += 1

    # Clear any hold state since suspension overrides
    user.hold_until = None

    # Create suspension record
    suspension = AccountSuspension(
        user_id=user.id,
        suspension_type="task_only_block",
        reason=susp_msg or f"Account suspended for {suspension_duration_hours}h due to task errors",
        triggering_error_id=task_error.id,
        error_count_at_suspension=user.error_count,
        status="active",
        duration_hours=suspension_duration_hours,
        suspended_at=now,
        expires_at=suspension_until,
        suspended_by="system",
    )
    db.add(suspension)
    await db.flush()


# ── Check access ─────────────────────────────────────────────────────────────

async def check_task_access(db: AsyncSession, user_id: int) -> dict:
    """Check if user can perform daily tasks. Returns access info.

    Checks user account_status first (most reliable), then falls back
    to checking individual restriction/suspension records.
    """
    now = datetime.now(timezone.utc)

    user = await db.get(User, user_id)
    if not user:
        return {"allowed": True, "status": "active"}

    # ── Check account_status field (source of truth) ──────────────
    status = user.account_status

    if status == STATUS_PERMANENTLY_CLOSED:
        return {
            "allowed": False,
            "reason": user.account_issue or "Your account has been permanently closed according to the company policy.",
            "status": "permanently_closed",
            "permanent_closed_at": user.permanent_closed_at.isoformat() if user.permanent_closed_at else None,
        }

    if status == STATUS_SUSPENDED:
        # Check if suspension actually expired
        if user.suspension_until and now >= user.suspension_until:
            # Suspension expired - check communication deadline
            comm_deadline_days = await _get_config_int(db, "communication_deadline_days", 7)
            deadline = user.suspended_at + timedelta(days=comm_deadline_days) if user.suspended_at else None
            if deadline and now >= deadline and not user.company_contact_status:
                # Permanent closure
                user.account_status = STATUS_PERMANENTLY_CLOSED
                user.permanent_closed_at = now
                closure_msg = await get_config_message(db, "permanent_closure_message")
                user.account_issue = closure_msg or "Your account has been permanently closed according to the company policy."
                await db.flush()
                return {
                    "allowed": False,
                    "reason": user.account_issue,
                    "status": "permanently_closed",
                    "permanent_closed_at": user.permanent_closed_at.isoformat(),
                }
            else:
                # Suspension expired, restore to active
                user.account_status = STATUS_ACTIVE
                user.account_issue = None
                user.suspended_at = None
                user.suspension_until = None
                await db.flush()
        else:
            susp_msg = await get_config_message(
                db, "suspension_message",
                suspension_until=user.suspension_until.strftime("%Y-%m-%d %H:%M UTC") if user.suspension_until else "N/A",
                error_count=user.error_count,
            )
            return {
                "allowed": False,
                "reason": user.account_issue or susp_msg or "Your account has been suspended due to repeated task errors.",
                "status": "suspended",
                "suspended_at": user.suspended_at.isoformat() if user.suspended_at else None,
                "suspension_until": user.suspension_until.isoformat() if user.suspension_until else None,
                "company_contact_status": user.company_contact_status,
            }

    if status == STATUS_ON_HOLD:
        # Check if hold actually expired
        if user.hold_until and now >= user.hold_until:
            user.account_status = STATUS_ACTIVE
            user.account_issue = None
            user.hold_until = None
            await db.flush()
        else:
            hold_msg = await get_config_message(
                db, "hold_message",
                hold_until=user.hold_until.strftime("%Y-%m-%d %H:%M UTC") if user.hold_until else "N/A",
                error_count=user.error_count,
            )
            return {
                "allowed": False,
                "reason": user.account_issue or hold_msg or "Your account has been temporarily placed on hold due to repeated task errors.",
                "status": "on_hold",
                "hold_until": user.hold_until.isoformat() if user.hold_until else None,
                "error_count": user.error_count,
            }

    # ── ACTIVE status ─────────────────────────────────────────────
    # Still show warning info if errors exist
    hold_threshold = await _get_config_int(db, "hold_threshold", 3)
    if user.error_count > 0 and user.error_count < hold_threshold:
        warning_msg = await get_config_message(
            db, "warning_message",
            error_count=user.error_count,
            hold_threshold=hold_threshold,
        )
        return {
            "allowed": True,
            "status": "warning",
            "warning": warning_msg or f"You have received a valid task error. Current error count: {user.error_count} of {hold_threshold} before account hold.",
            "error_count": user.error_count,
            "hold_threshold": hold_threshold,
            "cycle_end": user.error_cycle_end.isoformat() if user.error_cycle_end else None,
        }

    return {
        "allowed": True,
        "status": "active",
        "error_count": user.error_count,
        "hold_threshold": hold_threshold,
        "cycle_end": user.error_cycle_end.isoformat() if user.error_cycle_end else None,
    }


# ── Auto-expire holds and suspensions ───────────────────────────────────────

async def expire_stale_suspensions(db: AsyncSession):
    """Process automatic expiry of holds and suspensions.

    Called periodically and before status checks.
    """
    now = datetime.now(timezone.utc)

    # ── Expire holds ──────────────────────────────────────────────
    hold_result = await db.execute(
        select(User).where(
            and_(
                User.account_status == STATUS_ON_HOLD,
                User.hold_until.isnot(None),
                User.hold_until <= now,
            )
        )
    )
    hold_users = hold_result.scalars().all()
    for user in hold_users:
        user.account_status = STATUS_ACTIVE
        user.account_issue = None
        user.hold_until = None

    # ── Process suspensions ───────────────────────────────────────
    susp_result = await db.execute(
        select(User).where(
            and_(
                User.account_status == STATUS_SUSPENDED,
                User.suspension_until.isnot(None),
                User.suspension_until <= now,
            )
        )
    )
    susp_users = susp_result.scalars().all()
    for user in susp_users:
        # Suspension expired - check communication deadline
        comm_deadline_days = await _get_config_int(db, "communication_deadline_days", 7)
        deadline = user.suspended_at + timedelta(days=comm_deadline_days) if user.suspended_at else None

        if deadline and now >= deadline and not user.company_contact_status:
            # Permanent closure
            user.account_status = STATUS_PERMANENTLY_CLOSED
            user.permanent_closed_at = now
            closure_msg = await get_config_message(db, "permanent_closure_message")
            user.account_issue = closure_msg or "Your account has been permanently closed according to the company policy."
        else:
            # Suspension expired but within deadline - restore to active
            user.account_status = STATUS_ACTIVE
            user.account_issue = None
            user.suspended_at = None
            user.suspension_until = None

    # Also expire old AccountSuspension records for backward compatibility
    susp_update = await db.execute(
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

    affected = len(hold_users) + len(susp_users)
    if affected > 0 or susp_update.rowcount > 0:
        await db.commit()
