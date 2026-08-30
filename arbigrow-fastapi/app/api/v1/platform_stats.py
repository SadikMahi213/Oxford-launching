from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.platform_stats import PlatformStats
from app.schemas.platform_stats import (
    PlatformStatsCreate,
    PlatformStatsUpdate,
    PlatformStatsResponse,
)
from app.api.v1.deps import get_current_admin_user
from app.core.rate_limiter import limiter


router = APIRouter(prefix="/platform-stats", tags=["Platform Stats"])


@router.get("/")
@limiter.limit("30/minute")
async def get_platform_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    # The homepage Live Platform Statistics section is ENTIRELY admin-controlled.
    # No live database aggregates are used — only the saved admin values.
    result = await db.execute(select(PlatformStats).limit(1))
    stored = result.scalar_one_or_none()

    if stored:
        return {
            "id": stored.id,
            "total_users": stored.total_users,
            "total_invested": stored.total_invested,
            "total_withdrawn": stored.total_withdrawn,
            "total_profit_shared": stored.total_profit_shared,
            "active_investors": stored.active_investors,
            # Homepage field aliases (map admin fields to homepage display names)
            "verified_freelancers": stored.active_investors,
            "countries_connected": stored.total_profit_shared,
        }

    # No admin-configured stats yet — return zeros (never live aggregates)
    return {
        "total_users": "0",
        "verified_freelancers": "0",
        "total_invested": "0",
        "total_withdrawn": "0",
        "countries_connected": "0",
    }


@router.post("/", response_model=PlatformStatsResponse)
async def create_platform_stats(
    data: PlatformStatsCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin_user),
):

    existing = await db.execute(select(PlatformStats).limit(1))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Stats already exist")

    stats = PlatformStats(**data.dict())

    db.add(stats)
    await db.commit()
    await db.refresh(stats)

    return stats


@router.patch("/", response_model=PlatformStatsResponse)
async def update_platform_stats(
    data: PlatformStatsUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin_user),
):

    result = await db.execute(select(PlatformStats).limit(1))
    stats = result.scalar_one_or_none()

    if not stats:
        raise HTTPException(404, "Platform stats not found")

    update_data = data.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(stats, key, value)

    await db.commit()
    await db.refresh(stats)

    return stats
