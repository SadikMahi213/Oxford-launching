from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_admin_user, get_current_user
from app.core.database import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import (
    ActiveAnnouncementResponse,
    AnnouncementListResponse,
    AnnouncementResponse,
    AnnouncementStatusUpdate,
)
from app.services.b2_service import generate_presigned_url, upload_to_b2

router = APIRouter(prefix="/announcements", tags=["Announcements"])


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "on", "active"}:
        return True
    if normalized in {"false", "0", "no", "off", "inactive"}:
        return False
    return default


def _serialize_announcement(item: Announcement) -> AnnouncementResponse:
    resolved_image = generate_presigned_url(item.image_key) or item.image_url
    return AnnouncementResponse(
        id=item.id,
        title=item.title,
        message=item.message,
        image_url=resolved_image,
        is_active=bool(item.is_active),
        created_by=item.created_by,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/admin", response_model=AnnouncementListResponse)
async def get_admin_announcements(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    result = await db.execute(
        select(Announcement).order_by(
            Announcement.created_at.desc(),
            Announcement.id.desc(),
        )
    )
    items = result.scalars().all()
    return {"data": [_serialize_announcement(item) for item in items]}


@router.post("/admin", response_model=AnnouncementResponse)
async def create_announcement(
    title: str = Form(...),
    message: str | None = Form(None),
    is_active: str | None = Form(None),
    image: UploadFile | None = File(None),
    image_url: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    title_value = (title or "").strip()
    if not title_value:
        raise HTTPException(status_code=400, detail="Title is required")

    if image and image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    image_key = None
    if image:
        image_key = await upload_to_b2(image, f"announcements/{current_admin.id}")

    active_value = _parse_bool(is_active, default=False)
    if active_value:
        await db.execute(update(Announcement).values(is_active=False))

    item = Announcement(
        title=title_value,
        message=(message or "").strip() or None,
        image_key=image_key,
        image_url=(image_url or "").strip() or None,
        is_active=active_value,
        created_by=current_admin.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return _serialize_announcement(item)


@router.patch("/admin/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    title: str = Form(...),
    message: str | None = Form(None),
    is_active: str | None = Form(None),
    image: UploadFile | None = File(None),
    image_url: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")

    title_value = (title or "").strip()
    if not title_value:
        raise HTTPException(status_code=400, detail="Title is required")

    if image and image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    item.title = title_value
    item.message = (message or "").strip() or None

    if image:
        item.image_key = await upload_to_b2(
            image,
            f"announcements/{item.created_by or 'admin'}",
        )

    if image_url is not None:
        item.image_url = (image_url or "").strip() or None

    if is_active is not None:
        active_value = _parse_bool(is_active, default=bool(item.is_active))
        if active_value:
            await db.execute(
                update(Announcement)
                .where(Announcement.id != item.id)
                .values(is_active=False)
            )
        item.is_active = active_value

    await db.commit()
    await db.refresh(item)
    return _serialize_announcement(item)


@router.patch("/admin/{announcement_id}/status", response_model=AnnouncementResponse)
async def update_announcement_status(
    announcement_id: int,
    payload: AnnouncementStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if payload.is_active:
        await db.execute(
            update(Announcement)
            .where(Announcement.id != item.id)
            .values(is_active=False)
        )

    item.is_active = payload.is_active
    await db.commit()
    await db.refresh(item)
    return _serialize_announcement(item)


@router.delete("/admin/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    del current_admin
    result = await db.execute(
        select(Announcement).where(Announcement.id == announcement_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")

    await db.delete(item)
    await db.commit()
    return {"message": "Announcement deleted successfully"}


@router.get("/active", response_model=ActiveAnnouncementResponse)
async def get_active_announcement(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    del current_user
    result = await db.execute(
        select(Announcement)
        .where(Announcement.is_active.is_(True))
        .order_by(Announcement.updated_at.desc(), Announcement.id.desc())
        .limit(1)
    )
    item = result.scalar_one_or_none()

    if not item:
        return {"data": None}
    return {"data": _serialize_announcement(item)}
