from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, or_, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.task_errors import (
    TaskAttempt,
    TaskError,
    UserWarning,
    UserRestriction,
    AccountSuspension,
    TaskDisciplinaryConfig,
    AdminAuditLog,
)
from app.services.task_error_service import (
    check_task_access,
    expire_stale_suspensions,
    _get_config_int,
    STATUS_ACTIVE,
    STATUS_ON_HOLD,
    STATUS_SUSPENDED,
    STATUS_PERMANENTLY_CLOSED,
)

router = APIRouter(prefix="/admin/task-errors", tags=["Admin Task Errors"])


@router.get("/config")
async def get_disciplinary_config(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(TaskDisciplinaryConfig))
    configs = result.scalars().all()
    return {
        "data": [
            {"key": c.key, "value": c.value, "description": c.description}
            for c in configs
        ]
    }


@router.put("/config/{key}")
async def update_disciplinary_config(
    key: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    value = body.get("value")
    if value is None:
        raise HTTPException(400, detail="Value is required")

    result = await db.execute(
        select(TaskDisciplinaryConfig).where(TaskDisciplinaryConfig.key == key)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(404, detail=f"Config key '{key}' not found")

    old_value = config.value
    config.value = str(value)

    log = AdminAuditLog(
        admin_id=admin.id,
        action="update_disciplinary_config",
        details=f"Updated {key} from '{old_value}' to '{value}'",
    )
    db.add(log)
    await db.commit()
    return {"success": True, "key": key, "value": str(value)}


@router.get("/errors")
async def list_errors(
    status: str = Query(None, description="Filter by review_status: pending, reviewed, dismissed"),
    task_type: str = Query(None, description="Filter by task_type: captcha, ad_view"),
    user_id: int = Query(None, description="Filter by user_id"),
    account_status: str = Query(None, description="Filter by user account_status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    await expire_stale_suspensions(db)

    conditions = []
    if status:
        conditions.append(TaskError.review_status == status)
    if task_type:
        conditions.append(TaskError.task_type == task_type)
    if user_id:
        conditions.append(TaskError.user_id == user_id)

    # Join with User for account_status filter
    query = select(TaskError)
    count_query = select(func.count(TaskError.id))
    if account_status:
        query = query.join(User, TaskError.user_id == User.id)
        count_query = count_query.join(User, TaskError.user_id == User.id)
        conditions.append(User.account_status == account_status)

    if conditions:
        query = query.where(and_(*conditions))
        count_query = count_query.where(and_(*conditions))

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    result = await db.execute(
        query.order_by(desc(TaskError.created_at))
        .limit(limit)
        .offset(offset)
    )
    errors = result.scalars().all()

    user_ids = list(set(e.user_id for e in errors))
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": [
            {
                "id": e.id,
                "user_id": e.user_id,
                "username": users_map.get(e.user_id, User()).username if users_map.get(e.user_id) else None,
                "email": users_map.get(e.user_id, User()).email if users_map.get(e.user_id) else None,
                "task_type": e.task_type,
                "error_code": e.error_code,
                "error_reason": e.error_reason,
                "attempt_number": e.attempt_number,
                "system_action": e.system_action,
                "action_taken": e.action_taken,
                "review_status": e.review_status,
                "admin_notes": e.admin_notes,
                "error_count_at_time": e.error_count_at_time,
                "cycle_start": e.cycle_start.isoformat() if e.cycle_start else None,
                "cycle_end": e.cycle_end.isoformat() if e.cycle_end else None,
                "created_at": e.created_at.isoformat(),
                "user_access_allowed": users_map.get(e.user_id) and users_map[e.user_id].account_status in (STATUS_ACTIVE, "inactive", "pending_payment"),
                "user_access_status": users_map.get(e.user_id, User()).account_status if users_map.get(e.user_id) else "active",
            }
            for e in errors
        ],
    }


@router.put("/errors/{error_id}/review")
async def review_error(
    error_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(TaskError).where(TaskError.id == error_id))
    error = result.scalar_one_or_none()
    if not error:
        raise HTTPException(404, detail="Error not found")

    new_status = body.get("review_status", "reviewed")
    if new_status not in ("reviewed", "dismissed"):
        raise HTTPException(400, detail="Invalid review_status")

    error.review_status = new_status
    error.admin_notes = body.get("admin_notes", error.admin_notes)

    log = AdminAuditLog(
        admin_id=admin.id,
        action="review_error",
        target_user_id=error.user_id,
        details=f"Reviewed error {error_id}: {new_status}",
    )
    db.add(log)
    await db.commit()
    return {"success": True}


@router.get("/users/{user_id}/status")
async def get_user_task_status(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    await expire_stale_suspensions(db)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    access = await check_task_access(db, user_id)

    # Get error count in current cycle
    errors_result = await db.execute(
        select(func.count(TaskError.id)).where(TaskError.user_id == user_id)
    )
    total_errors = errors_result.scalar() or 0

    warnings_result = await db.execute(
        select(UserWarning)
        .where(UserWarning.user_id == user_id)
        .order_by(desc(UserWarning.created_at))
        .limit(10)
    )
    warnings = warnings_result.scalars().all()

    restrictions_result = await db.execute(
        select(UserRestriction)
        .where(UserRestriction.user_id == user_id)
        .order_by(desc(UserRestriction.created_at))
        .limit(10)
    )
    restrictions = restrictions_result.scalars().all()

    suspensions_result = await db.execute(
        select(AccountSuspension)
        .where(AccountSuspension.user_id == user_id)
        .order_by(desc(AccountSuspension.suspended_at))
        .limit(10)
    )
    suspensions = suspensions_result.scalars().all()

    return {
        "user_id": user_id,
        "username": user.username,
        "email": user.email,
        "access": access,
        "total_errors": total_errors,
        "account_status": user.account_status,
        "error_count": user.error_count,
        "error_cycle_start": user.error_cycle_start.isoformat() if user.error_cycle_start else None,
        "error_cycle_end": user.error_cycle_end.isoformat() if user.error_cycle_end else None,
        "hold_count": user.hold_count,
        "last_hold_at": user.last_hold_at.isoformat() if user.last_hold_at else None,
        "hold_until": user.hold_until.isoformat() if user.hold_until else None,
        "suspension_count": user.suspension_count,
        "suspended_at": user.suspended_at.isoformat() if user.suspended_at else None,
        "suspension_until": user.suspension_until.isoformat() if user.suspension_until else None,
        "permanent_closed_at": user.permanent_closed_at.isoformat() if user.permanent_closed_at else None,
        "company_contact_status": user.company_contact_status,
        "contact_recorded_at": user.contact_recorded_at.isoformat() if user.contact_recorded_at else None,
        "account_issue": user.account_issue,
        "warnings": [
            {
                "id": w.id,
                "warning_type": w.warning_type,
                "reason": w.reason,
                "error_count_at_warning": w.error_count_at_warning,
                "is_active": w.is_active,
                "created_at": w.created_at.isoformat(),
            }
            for w in warnings
        ],
        "restrictions": [
            {
                "id": r.id,
                "restriction_type": r.restriction_type,
                "reason": r.reason,
                "error_count_at_restriction": r.error_count_at_restriction,
                "is_active": r.is_active,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "created_at": r.created_at.isoformat(),
            }
            for r in restrictions
        ],
        "suspensions": [
            {
                "id": s.id,
                "suspension_type": s.suspension_type,
                "reason": s.reason,
                "status": s.status,
                "duration_hours": s.duration_hours,
                "suspended_at": s.suspended_at.isoformat(),
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "lifted_at": s.lifted_at.isoformat() if s.lifted_at else None,
                "admin_notes": s.admin_notes,
            }
            for s in suspensions
        ],
    }


@router.post("/users/{user_id}/warn")
async def issue_warning(
    user_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    reason = body.get("reason", "Manual warning by admin")
    warning = UserWarning(
        user_id=user_id,
        warning_type="manual_admin",
        reason=reason,
        issued_by="admin",
        admin_id=admin.id,
        is_active=True,
    )
    db.add(warning)

    log = AdminAuditLog(
        admin_id=admin.id,
        action="issue_warning",
        target_user_id=user_id,
        details=f"Manual warning: {reason}",
    )
    db.add(log)
    await db.commit()
    return {"success": True, "warning_id": warning.id}


@router.post("/users/{user_id}/restrict")
async def restrict_user(
    user_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    reason = body.get("reason", "Manual restriction by admin")
    hours = body.get("hours", 24)
    restriction = UserRestriction(
        user_id=user_id,
        restriction_type="daily_task_blocked",
        reason=reason,
        is_active=True,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=hours),
        issued_by="admin",
        admin_id=admin.id,
    )
    db.add(restriction)

    log = AdminAuditLog(
        admin_id=admin.id,
        action="restrict_user",
        target_user_id=user_id,
        details=f"Restricted for {hours}h: {reason}",
    )
    db.add(log)
    await db.commit()
    return {"success": True, "restriction_id": restriction.id}


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    reason = body.get("reason", "Manual suspension by admin")
    hours = body.get("hours", 24)

    now = datetime.now(timezone.utc)
    suspension = AccountSuspension(
        user_id=user_id,
        suspension_type="task_only_block",
        reason=reason,
        status="active",
        duration_hours=hours,
        suspended_at=now,
        expires_at=now + timedelta(hours=hours),
        suspended_by="admin",
        admin_id=admin.id,
        admin_notes=body.get("admin_notes"),
    )
    db.add(suspension)

    user.account_status = STATUS_SUSPENDED
    user.account_issue = f"Suspended for {hours}h by admin"
    user.suspended_at = now
    user.suspension_until = now + timedelta(hours=hours)
    user.suspension_count += 1

    log = AdminAuditLog(
        admin_id=admin.id,
        action="suspend_user",
        target_user_id=user_id,
        details=f"Suspended for {hours}h: {reason}",
    )
    db.add(log)
    await db.commit()
    return {"success": True, "suspension_id": suspension.id}


@router.post("/users/{user_id}/lift-restriction")
async def lift_restriction(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        update(UserRestriction)
        .where(
            and_(
                UserRestriction.user_id == user_id,
                UserRestriction.is_active == True,
            )
        )
        .values(is_active=False)
    )

    log = AdminAuditLog(
        admin_id=admin.id,
        action="lift_restriction",
        target_user_id=user_id,
        details=f"Lifted {result.rowcount} active restriction(s)",
    )
    db.add(log)
    await db.commit()
    return {"success": True, "lifted_count": result.rowcount}


@router.post("/users/{user_id}/lift-suspension")
async def lift_suspension(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        update(AccountSuspension)
        .where(
            and_(
                AccountSuspension.user_id == user_id,
                AccountSuspension.status == "active",
            )
        )
        .values(status="expired", lifted_at=now)
    )

    user = await db.get(User, user_id)
    if user:
        user.account_status = STATUS_ACTIVE
        user.account_issue = None
        user.suspended_at = None
        user.suspension_until = None
        user.hold_until = None

    log = AdminAuditLog(
        admin_id=admin.id,
        action="lift_suspension",
        target_user_id=user_id,
        details=f"Lifted {result.rowcount} active suspension(s)",
    )
    db.add(log)
    await db.commit()
    return {"success": True, "lifted_count": result.rowcount}


@router.post("/users/{user_id}/record-contact")
async def record_company_contact(
    user_id: int,
    body: dict,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Record that a suspended user has contacted the company."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    user.company_contact_status = True
    user.contact_recorded_at = datetime.now(timezone.utc)
    user.recorded_by_admin = admin.id

    notes = body.get("notes", "")
    log = AdminAuditLog(
        admin_id=admin.id,
        action="record_company_contact",
        target_user_id=user_id,
        details=f"Company contact recorded. Notes: {notes}" if notes else "Company contact recorded",
    )
    db.add(log)
    await db.commit()
    return {"success": True}


@router.post("/users/{user_id}/reset-cycle")
async def reset_error_cycle(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Manually reset a user's error cycle."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    user.error_count = 0
    user.hold_count = 0
    user.error_cycle_start = None
    user.error_cycle_end = None

    log = AdminAuditLog(
        admin_id=admin.id,
        action="reset_error_cycle",
        target_user_id=user_id,
        details="Manually reset error cycle",
    )
    db.add(log)
    await db.commit()
    return {"success": True}


@router.get("/audit-log")
async def get_audit_log(
    admin_id: int = Query(None),
    action: str = Query(None),
    target_user_id: int = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    conditions = []
    if admin_id:
        conditions.append(AdminAuditLog.admin_id == admin_id)
    if action:
        conditions.append(AdminAuditLog.action == action)
    if target_user_id:
        conditions.append(AdminAuditLog.target_user_id == target_user_id)

    count_result = await db.execute(
        select(func.count(AdminAuditLog.id)).where(and_(*conditions) if conditions else True)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(AdminAuditLog)
        .where(and_(*conditions) if conditions else True)
        .order_by(desc(AdminAuditLog.created_at))
        .limit(limit)
        .offset(offset)
    )
    logs = result.scalars().all()

    return {
        "total": total,
        "data": [
            {
                "id": l.id,
                "admin_id": l.admin_id,
                "action": l.action,
                "target_user_id": l.target_user_id,
                "details": l.details,
                "ip_address": l.ip_address,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
    }
