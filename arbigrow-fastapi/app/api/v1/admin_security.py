from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.system_config import SystemConfig
from app.models.security_log import SecurityLog
from app.services.security_logger import SecurityLogger
from app.utils.notifications import notify_admin

router = APIRouter(
    prefix="/admin/security",
    tags=["Admin Security"],
)


@router.get("/blocked-accounts")
async def get_blocked_accounts(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    offset = (page - 1) * limit

    total_result = await db.execute(
        select(func.count(User.id)).where(User.blocked_at.isnot(None))
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(
            User.id,
            User.username,
            User.full_name,
            User.email,
            User.user_no,
            User.account_status,
            User.failed_attempts,
            User.blocked_at,
            User.blocked_reason,
            User.blocked_by,
            User.last_login_ip,
            User.last_login_device,
            User.last_login_at,
        )
        .where(User.blocked_at.isnot(None))
        .order_by(desc(User.blocked_at))
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": [
            {
                "id": row.id,
                "user_no": row.user_no,
                "full_name": row.full_name,
                "email": row.email,
                "username": row.username,
                "account_status": row.account_status,
                "failed_attempts": row.failed_attempts,
                "blocked_at": row.blocked_at.isoformat() if row.blocked_at else None,
                "blocked_reason": row.blocked_reason,
                "blocked_by": row.blocked_by,
                "last_login_ip": row.last_login_ip,
                "last_login_device": row.last_login_device,
                "last_login_at": row.last_login_at.isoformat() if row.last_login_at else None,
            }
            for row in rows
        ],
    }


@router.patch("/unblock/{user_id}")
async def unblock_account(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.blocked_at:
        raise HTTPException(status_code=400, detail="Account is not blocked")

    user.failed_attempts = 0
    user.blocked_at = None
    user.blocked_reason = None
    await db.commit()

    sec_logger = SecurityLogger(db)
    await sec_logger.log(
        event_type="account_unblocked",
        user_id=user.id,
        email=user.email,
        ip_address=request.client.host if request.client else None,
        device=(request.headers.get("user-agent", "") or "")[:255],
        details=f"Unblocked by admin {current_admin.full_name} ({current_admin.email})",
    )

    await notify_admin(
        db=db, type="account_unblocked",
        message=f"Account unblocked for {user.full_name} ({user.email}) by admin",
        user_id=user.id, request=request,
    )

    return {"message": f"Account unblocked for {user.full_name}"}


@router.get("/logs")
async def get_security_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    event_type: str | None = None,
    user_id: int | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    offset = (page - 1) * limit

    conditions = []
    if event_type:
        conditions.append(SecurityLog.event_type == event_type)
    if user_id:
        conditions.append(SecurityLog.user_id == user_id)
    if search:
        conditions.append(
            func.lower(SecurityLog.email).like(f"%{search.lower()}%")
        )

    base = select(SecurityLog)
    if conditions:
        from sqlalchemy import and_
        base = base.where(and_(*conditions))

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar() or 0

    stmt = (
        base.order_by(desc(SecurityLog.created_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()

    # Map user_ids to usernames
    user_ids = {log.user_id for log in logs if log.user_id}
    user_no_map = {}
    if user_ids:
        user_result = await db.execute(
            select(User.id, User.user_no).where(User.id.in_(user_ids))
        )
        user_no_map = {uid: uno for uid, uno in user_result.all()}

    total_pages = max(1, (total + limit - 1) // limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_no": user_no_map.get(log.user_id),
                "event_type": log.event_type,
                "email": log.email,
                "ip_address": log.ip_address,
                "device": log.device,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


@router.get("/event-types")
async def get_event_types(
    current_admin: User = Depends(get_current_admin_user),
):
    return {
        "event_types": [
            "login",
            "logout",
            "failed_login",
            "account_blocked",
            "account_unblocked",
            "password_change",
        ]
    }


# ── Security settings (SystemConfig-backed) ─────────────────────────────

DEFAULTS = {
    "login_max_attempts": "5",
    "login_lockout_minutes": "30",
}


class SecuritySettingsUpdate(BaseModel):
    login_max_attempts: int
    login_lockout_minutes: int


async def _read_security_setting(db: AsyncSession, key: str) -> str:
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == key)
    )
    row = result.scalar_one_or_none()
    return row.value if row else DEFAULTS[key]


@router.get("/settings")
async def get_security_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    max_attempts = await _read_security_setting(db, "login_max_attempts")
    lockout_minutes = await _read_security_setting(db, "login_lockout_minutes")
    return {
        "login_max_attempts": int(max_attempts),
        "login_lockout_minutes": int(lockout_minutes),
    }


@router.put("/settings")
async def update_security_settings(
    body: SecuritySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    if body.login_max_attempts < 0 or body.login_max_attempts > 100:
        raise HTTPException(status_code=400, detail="login_max_attempts must be between 0 and 100")
    if body.login_lockout_minutes < 1 or body.login_lockout_minutes > 1440:
        raise HTTPException(status_code=400, detail="login_lockout_minutes must be between 1 and 1440")

    for key, value in [
        ("login_max_attempts", str(body.login_max_attempts)),
        ("login_lockout_minutes", str(body.login_lockout_minutes)),
    ]:
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == key)
        )
        config = result.scalar_one_or_none()
        if config:
            config.value = value
        else:
            db.add(SystemConfig(key=key, value=value))

    await db.commit()

    sec_logger = SecurityLogger(db)
    await sec_logger.log(
        event_type="settings_changed",
        user_id=current_admin.id,
        email=current_admin.email,
        ip_address=None,
        device=None,
        details=f"Login security updated: max_attempts={body.login_max_attempts}, lockout_minutes={body.login_lockout_minutes}",
    )

    return {
        "login_max_attempts": body.login_max_attempts,
        "login_lockout_minutes": body.login_lockout_minutes,
    }
