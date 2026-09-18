from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_admin_user
from app.core.database import get_db
from app.core.rate_limiter import limiter
from app.models.user import User
from app.services.analytics_service import AnalyticsTracker

router = APIRouter(prefix="/admin/self-analytics", tags=["Admin Self Analytics"])


@router.get("/summary")
@limiter.limit("30/minute")
async def get_summary(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    tracker = AnalyticsTracker(db)
    data = await tracker.get_summary()
    return {"success": True, "data": data}


@router.get("/countries")
@limiter.limit("30/minute")
async def get_countries(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    tracker = AnalyticsTracker(db)
    data = await tracker.get_countries(limit=limit)
    return {"success": True, "data": data}


@router.get("/devices")
@limiter.limit("30/minute")
async def get_devices(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    tracker = AnalyticsTracker(db)
    data = await tracker.get_device_report()
    return {"success": True, "data": data}


@router.get("/sources")
@limiter.limit("30/minute")
async def get_sources(
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    tracker = AnalyticsTracker(db)
    data = await tracker.get_traffic_sources()
    return {"success": True, "data": data}


@router.get("/charts/daily")
@limiter.limit("30/minute")
async def get_chart_daily(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    tracker = AnalyticsTracker(db)
    data = await tracker.get_daily_visitors(days=days)
    return {"success": True, "data": data}


@router.get("/charts/weekly")
@limiter.limit("30/minute")
async def get_chart_weekly(
    request: Request,
    weeks: int = Query(12, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    tracker = AnalyticsTracker(db)
    data = await tracker.get_weekly_visitors(weeks=weeks)
    return {"success": True, "data": data}


@router.get("/charts/monthly")
@limiter.limit("30/minute")
async def get_chart_monthly(
    request: Request,
    months: int = Query(12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    tracker = AnalyticsTracker(db)
    data = await tracker.get_monthly_visitors(months=months)
    return {"success": True, "data": data}
