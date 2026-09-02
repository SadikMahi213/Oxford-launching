"""Admin User ID Restore API.

Allows administrators to view and restore affected user accounts.
Restores suspended, restricted, warned, or blocked accounts without
modifying financial data. All actions are audit-logged.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.task_errors import (
    TaskError,
    UserWarning,
    UserRestriction,
    AccountSuspension,
    AdminAuditLog,
)
from app.services.task_error_service import expire_stale_suspensions
from app.services.security_logger import SecurityLogger

router = APIRouter(prefix="/admin/restore", tags=["Admin Account Restore"])


class RestoreActionRequest(BaseModel):
    action: str
    reason: str = ""
    confirmed: bool = False


@router.get("/user/{user_id}")
async def get_restore_status(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Get comprehensive user status for restore evaluation."""
    await expire_stale_suspensions(db)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    now = datetime.now(timezone.utc)

    active_suspensions_result = await db.execute(
        select(AccountSuspension).where(
            and_(
                AccountSuspension.user_id == user_id,
                AccountSuspension.status == "active",
            )
        ).order_by(AccountSuspension.suspended_at.desc())
    )
    active_suspensions = active_suspensions_result.scalars().all()

    active_restrictions_result = await db.execute(
        select(UserRestriction).where(
            and_(
                UserRestriction.user_id == user_id,
                UserRestriction.is_active == True,
            )
        ).order_by(UserRestriction.created_at.desc())
    )
    active_restrictions = active_restrictions_result.scalars().all()

    active_warnings_result = await db.execute(
        select(UserWarning).where(
            and_(
                UserWarning.user_id == user_id,
                UserWarning.is_active == True,
            )
        ).order_by(UserWarning.created_at.desc())
    )
    active_warnings = active_warnings_result.scalars().all()

    total_errors_result = await db.execute(
        select(func.count(TaskError.id)).where(TaskError.user_id == user_id)
    )
    total_errors = total_errors_result.scalar() or 0

    is_blocked = user.blocked_at is not None
    is_suspended = len(active_suspensions) > 0
    is_restricted = len(active_restrictions) > 0
    is_warned = len(active_warnings) > 0
    is_on_hold = (user.account_status or "").lower() == "on_hold"

    restorable_actions = []
    if is_suspended:
        restorable_actions.append("lift_suspension")
    if is_restricted:
        restorable_actions.append("lift_restriction")
    if is_warned:
        restorable_actions.append("dismiss_warnings")
    if is_blocked:
        restorable_actions.append("unblock_login")
    if is_on_hold and not is_suspended:
        restorable_actions.append("restore_account_status")
    if len(restorable_actions) > 1:
        restorable_actions.append("full_restore")

    return {
        "user": {
            "id": user.id,
            "user_no": user.user_no,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "account_status": user.account_status,
            "account_issue": user.account_issue,
            "email_verified": user.email_verified,
            "is_blocked": is_blocked,
            "blocked_at": user.blocked_at.isoformat() if user.blocked_at else None,
            "blocked_reason": user.blocked_reason,
        },
        "total_errors": total_errors,
        "active_suspensions": [
            {
                "id": s.id,
                "suspension_type": s.suspension_type,
                "reason": s.reason,
                "status": s.status,
                "duration_hours": s.duration_hours,
                "suspended_at": s.suspended_at.isoformat(),
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "suspended_by": s.suspended_by,
            }
            for s in active_suspensions
        ],
        "active_restrictions": [
            {
                "id": r.id,
                "restriction_type": r.restriction_type,
                "reason": r.reason,
                "is_active": r.is_active,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "issued_by": r.issued_by,
            }
            for r in active_restrictions
        ],
        "active_warnings": [
            {
                "id": w.id,
                "warning_type": w.warning_type,
                "reason": w.reason,
                "is_active": w.is_active,
                "issued_by": w.issued_by,
            }
            for w in active_warnings
        ],
        "restorable_actions": restorable_actions,
        "is_affected": len(restorable_actions) > 0,
    }


@router.post("/user/{user_id}")
async def execute_restore(
    user_id: int,
    body: RestoreActionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Execute a restore action on a user account."""
    if not body.confirmed:
        raise HTTPException(400, detail="Confirmation required. Set confirmed=true to proceed.")

    valid_actions = {
        "lift_suspension",
        "lift_restriction",
        "dismiss_warnings",
        "unblock_login",
        "restore_account_status",
        "full_restore",
    }
    if body.action not in valid_actions:
        raise HTTPException(400, detail=f"Invalid action. Must be one of: {', '.join(sorted(valid_actions))}")

    await expire_stale_suspensions(db)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    now = datetime.now(timezone.utc)
    changes = []

    if body.action in ("lift_suspension", "full_restore", "restore_account_status"):
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
        if result.rowcount > 0:
            changes.append(f"Lifted {result.rowcount} active suspension(s)")

        if user.account_status == "on_hold":
            user.account_status = "active"
            user.account_issue = None
            changes.append("Restored account status from on_hold to active")

    if body.action in ("lift_restriction", "full_restore"):
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
        if result.rowcount > 0:
            changes.append(f"Deactivated {result.rowcount} active restriction(s)")

    if body.action in ("dismiss_warnings", "full_restore"):
        result = await db.execute(
            update(UserWarning)
            .where(
                and_(
                    UserWarning.user_id == user_id,
                    UserWarning.is_active == True,
                )
            )
            .values(is_active=False)
        )
        if result.rowcount > 0:
            changes.append(f"Dismissed {result.rowcount} active warning(s)")

    if body.action in ("unblock_login", "full_restore"):
        if user.blocked_at:
            user.failed_attempts = 0
            user.blocked_at = None
            user.blocked_reason = None
            changes.append("Removed login block")

    if not changes:
        raise HTTPException(400, detail="No restorable issues found for this user.")

    log = AdminAuditLog(
        admin_id=admin.id,
        action=f"restore_{body.action}",
        target_user_id=user_id,
        details=f"Action: {body.action}. Changes: {'; '.join(changes)}. Reason: {body.reason or 'No reason provided'}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)

    sec_logger = SecurityLogger(db)
    await sec_logger.log(
        event_type=f"admin_restore_{body.action}",
        user_id=user_id,
        email=user.email,
        ip_address=request.client.host if request.client else None,
        device=(request.headers.get("user-agent", "") or "")[:255],
        details=f"Restored by admin {admin.full_name} ({admin.email}). Action: {body.action}. Reason: {body.reason or 'No reason provided'}",
    )

    await db.commit()

    return {
        "success": True,
        "action": body.action,
        "changes": changes,
        "user_id": user_id,
    }


@router.get("/audit-log")
async def get_restore_audit_log(
    user_id: int = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """View audit log of restore actions."""
    conditions = [
        AdminAuditLog.action.like("restore_%"),
    ]
    if user_id:
        conditions.append(AdminAuditLog.target_user_id == user_id)

    count_result = await db.execute(
        select(func.count(AdminAuditLog.id)).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(AdminAuditLog)
        .where(and_(*conditions))
        .order_by(AdminAuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    logs = result.scalars().all()

    admin_ids = list(set(l.admin_id for l in logs))
    admin_map = {}
    if admin_ids:
        admins_result = await db.execute(
            select(User.id, User.full_name, User.email).where(User.id.in_(admin_ids))
        )
        for row in admins_result.all():
            admin_map[row.id] = {"full_name": row.full_name, "email": row.email}

    target_ids = list(set(l.target_user_id for l in logs if l.target_user_id))
    target_map = {}
    if target_ids:
        targets_result = await db.execute(
            select(User.id, User.username, User.email).where(User.id.in_(target_ids))
        )
        for row in targets_result.all():
            target_map[row.id] = {"username": row.username, "email": row.email}

    return {
        "total": total,
        "data": [
            {
                "id": l.id,
                "admin_id": l.admin_id,
                "admin_name": admin_map.get(l.admin_id, {}).get("full_name"),
                "admin_email": admin_map.get(l.admin_id, {}).get("email"),
                "action": l.action,
                "target_user_id": l.target_user_id,
                "target_username": target_map.get(l.target_user_id, {}).get("username"),
                "target_email": target_map.get(l.target_user_id, {}).get("email"),
                "details": l.details,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
    }
