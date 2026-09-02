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

    config.value = str(value)

    log = AdminAuditLog(
        admin_id=admin.id,
        action="update_disciplinary_config",
        details=f"Updated {key} from '{config.value}' to '{value}'",
    )
    db.add(log)
    await db.commit()
    return {"success": True, "key": key, "value": str(value)}


@router.get("/errors")
async def list_errors(
    status: str = Query(None, description="Filter by review_status: pending, reviewed, dismissed"),
    task_type: str = Query(None, description="Filter by task_type: captcha, ad_view"),
    user_id: int = Query(None, description="Filter by user_id"),
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

    count_result = await db.execute(
        select(func.count(TaskError.id)).where(and_(*conditions) if conditions else True)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(TaskError)
        .where(and_(*conditions) if conditions else True)
        .order_by(desc(TaskError.created_at))
        .limit(limit)
        .offset(offset)
    )
    errors = result.scalars().all()

    user_ids = list(set(e.user_id for e in errors))
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    user_access_map = {}
    for uid in user_ids:
        user_access_map[uid] = await check_task_access(db, uid)

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
                "review_status": e.review_status,
                "admin_notes": e.admin_notes,
                "created_at": e.created_at.isoformat(),
                "user_access_allowed": user_access_map.get(e.user_id, {}).get("allowed", True),
                "user_access_status": user_access_map.get(e.user_id, {}).get("status", "active"),
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

    errors_result = await db.execute(
        select(func.count(TaskError.id)).where(TaskError.user_id == user_id)
    )
    total_errors = errors_result.scalar() or 0

    return {
        "user_id": user_id,
        "username": user.username,
        "access": access,
        "total_errors": total_errors,
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

    user.account_status = "on_hold"
    user.account_issue = f"Suspended for {hours}h by admin"

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
    if user and user.account_status == "on_hold":
        user.account_status = "active"
        user.account_issue = None

    log = AdminAuditLog(
        admin_id=admin.id,
        action="lift_suspension",
        target_user_id=user_id,
        details=f"Lifted {result.rowcount} active suspension(s)",
    )
    db.add(log)
    await db.commit()
    return {"success": True, "lifted_count": result.rowcount}


@router.get("/audit-log")
async def get_audit_log(
    admin_id: int = Query(None),
    action: str = Query(None),
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
