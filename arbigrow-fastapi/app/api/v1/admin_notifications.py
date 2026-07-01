import asyncio
import json

from fastapi import APIRouter, Depends, Query, Path, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from starlette.responses import StreamingResponse

from app.core.database import get_db
from app.core.security import _decode_token
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.services.notification_service import NotificationService, NotificationEventBus

router = APIRouter(prefix="/admin/notifications", tags=["admin_notifications"])


def _notif_to_dict(n):
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "priority": n.priority,
        "user_id": n.user_id,
        "user_no": getattr(n, "user_no", None),
        "ip_address": n.ip_address,
        "device": n.device,
        "is_read": n.is_read,
        "metadata_json": n.metadata_json,
        "created_at": n.created_at.isoformat() + "Z" if n.created_at else None,
    }


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    is_read: bool = Query(None),
    type: str = Query(None),
    priority: str = Query(None),
    search: str = Query(None),
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    result = await service.get_notifications(
        page=page,
        per_page=per_page,
        is_read=is_read,
        type=type,
        priority=priority,
        search=search,
    )
    return {
        "success": True,
        "data": {
            "items": [_notif_to_dict(n) for n in result["items"]],
            "total": result["total"],
            "page": result["page"],
            "per_page": result["per_page"],
            "total_pages": result["total_pages"],
        },
    }


@router.get("/unread-count")
async def unread_count(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    count = await service.get_unread_count()
    return {"success": True, "data": {"count": count}}


@router.get("/recent")
async def recent_notifications(
    limit: int = Query(5, ge=1, le=50),
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    items = await service.get_recent(limit=limit)
    return {
        "success": True,
        "data": {"items": [_notif_to_dict(n) for n in items]},
    }


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: int = Path(...),
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    ok = await service.mark_as_read(notification_id)
    return {"success": ok}


@router.patch("/read-all")
async def mark_all_read(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    count = await service.mark_all_as_read()
    return {"success": True, "data": {"marked": count}}


@router.get("/stream")
async def notification_stream(
    request: Request,
    token: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    raw = None
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        raw = auth.split(" ", 1)[1]
    elif token:
        raw = token
    else:
        raw = request.cookies.get("access_token")

    if raw:
        payload = _decode_token(raw)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == int(user_id), User.is_admin == True))
                if not result.scalar_one_or_none():
                    raw = None
            else:
                raw = None
        else:
            raw = None

    if not raw:
        raise HTTPException(status_code=401, detail="Not authenticated")

    q = NotificationEventBus.subscribe()

    async def event_generator():
        try:
            while True:
                try:
                    data = await asyncio.wait_for(q.get(), timeout=30)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            NotificationEventBus.unsubscribe(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
