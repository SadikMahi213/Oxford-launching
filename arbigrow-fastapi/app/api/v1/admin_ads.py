import re
from decimal import Decimal

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile, File
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.ad import Ad
from app.models.user_ad_view import UserAdView
from app.models.ad_view import AdView
from app.services.b2_service import upload_to_b2, generate_presigned_url

router = APIRouter(prefix="/admin/ads", tags=["Admin Ads"])


def _resolve_thumbnail_url(stored: str | None) -> str | None:
    if not stored:
        return None
    if stored.startswith("http://") or stored.startswith("https://"):
        return stored
    return generate_presigned_url(stored, expires_in=604800)


def extract_youtube_video_id(url: str) -> str | None:
    patterns = [
        r'(?:youtube\.com/watch\?v=)([\w-]+)',
        r'(?:youtu\.be/)([\w-]+)',
        r'(?:youtube\.com/embed/)([\w-]+)',
        r'(?:youtube\.com/shorts/)([\w-]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


@router.get("")
async def admin_list_ads(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    offset = (page - 1) * limit

    total_result = await db.execute(select(func.count(Ad.id)))
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Ad).order_by(Ad.created_at.desc()).offset(offset).limit(limit)
    )
    ads = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "ads": [
            {
                "id": a.id,
                "title": a.title,
                "youtube_url": a.youtube_url,
                "video_id": a.video_id,
                "thumbnail": _resolve_thumbnail_url(a.thumbnail),
                "required_watch_seconds": a.required_watch_seconds,
                "is_active": a.is_active,
                "created_by": a.created_by,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None,
            }
            for a in ads
        ],
    }


@router.post("")
async def admin_create_ad(
    title: str = Form(...),
    youtube_url: str = Form(...),
    required_watch_seconds: int = Form(30),
    thumbnail: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    video_id = extract_youtube_video_id(youtube_url)
    if not video_id:
        raise HTTPException(400, detail="Invalid YouTube URL. Could not extract video ID.")

    if required_watch_seconds < 5:
        raise HTTPException(400, detail="Required watch seconds must be at least 5.")

    existing = await db.execute(
        select(Ad).where(Ad.video_id == video_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, detail="An ad with this YouTube video already exists.")

    ad = Ad(
        title=title.strip(),
        youtube_url=youtube_url.strip(),
        video_id=video_id,
        required_watch_seconds=required_watch_seconds,
        created_by=admin.id,
    )
    db.add(ad)
    await db.commit()
    await db.refresh(ad)

    if thumbnail and thumbnail.filename:
        if thumbnail.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            raise HTTPException(400, detail="Only JPEG, PNG, WebP, and GIF images are allowed.")
        object_key = await upload_to_b2(thumbnail, f"ads/{ad.id}")
        ad.thumbnail = object_key
    else:
        ad.thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

    await db.commit()
    await db.refresh(ad)

    return {
        "status": "created",
        "ad_id": ad.id,
        "title": ad.title,
        "video_id": ad.video_id,
        "thumbnail": _resolve_thumbnail_url(ad.thumbnail),
    }


@router.put("/{ad_id}")
async def admin_update_ad(
    ad_id: int,
    title: str | None = Form(None),
    youtube_url: str | None = Form(None),
    required_watch_seconds: int | None = Form(None),
    thumbnail: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Ad).where(Ad.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        raise HTTPException(404, detail="Ad not found")

    if title is not None:
        ad.title = title.strip()
    if required_watch_seconds is not None:
        if required_watch_seconds < 5:
            raise HTTPException(400, detail="Required watch seconds must be at least 5.")
        ad.required_watch_seconds = required_watch_seconds
    if youtube_url is not None:
        video_id = extract_youtube_video_id(youtube_url)
        if not video_id:
            raise HTTPException(400, detail="Invalid YouTube URL.")
        ad.youtube_url = youtube_url.strip()
        ad.video_id = video_id
    if thumbnail and thumbnail.filename:
        if thumbnail.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            raise HTTPException(400, detail="Only JPEG, PNG, WebP, and GIF images are allowed.")
        object_key = await upload_to_b2(thumbnail, f"ads/{ad_id}")
        ad.thumbnail = object_key
    if youtube_url is not None and not (thumbnail and thumbnail.filename):
        ad.thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

    await db.commit()
    return {"status": "updated", "ad_id": ad.id}


@router.patch("/{ad_id}/toggle")
async def admin_toggle_ad(
    ad_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Ad).where(Ad.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        raise HTTPException(404, detail="Ad not found")

    ad.is_active = not ad.is_active
    await db.commit()
    return {"status": "updated", "is_active": ad.is_active}


@router.delete("/{ad_id}")
async def admin_delete_ad(
    ad_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Ad).where(Ad.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        raise HTTPException(404, detail="Ad not found")

    await db.execute(
        delete(UserAdView).where(UserAdView.ad_id == ad_id)
    )
    await db.execute(
        delete(AdView).where(AdView.ad_id == ad_id)
    )
    await db.delete(ad)
    await db.commit()
    return {"status": "deleted", "ad_id": ad_id}
