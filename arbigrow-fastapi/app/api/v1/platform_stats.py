from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func

from app.core.database import get_db
from app.models.platform_stats import PlatformStats
from app.models.user import User
from app.models.kyc import KYC
from app.models.investments import Investment
from app.models.withdrawal import Withdrawal
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
    total_users_result = await db.execute(select(sa_func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    verified_result = await db.execute(
        select(sa_func.count(KYC.id)).where(KYC.status == "approved")
    )
    verified_freelancers = verified_result.scalar() or 0

    invested_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Investment.invested_amount), 0))
    )
    total_invested = float(invested_result.scalar() or 0)

    withdrawn_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Withdrawal.amount), 0))
        .where(Withdrawal.status == "approved")
    )
    total_withdrawn = float(withdrawn_result.scalar() or 0)

    countries_result = await db.execute(
        select(sa_func.count(sa_func.distinct(User.country_of_residence)))
        .where(User.country_of_residence.isnot(None))
        .where(User.country_of_residence != "")
    )
    countries_connected = countries_result.scalar() or 0

    return {
        "total_users": total_users,
        "verified_freelancers": verified_freelancers,
        "total_invested": total_invested,
        "total_withdrawn": total_withdrawn,
        "countries_connected": countries_connected,
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
