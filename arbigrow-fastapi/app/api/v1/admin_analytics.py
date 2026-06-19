from fastapi import APIRouter, Depends, Request
from app.api.v1.deps import get_current_admin_user
from app.core.rate_limiter import limiter
from app.services.ga4_service import ga4_service

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


def _ok(data):
    return {"success": True, "data": data}


def _fallback(msg="Analytics not available"):
    return {"success": False, "data": None, "message": msg}


@router.get("/overview")
@limiter.limit("30/minute")
async def get_overview(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback("Google Analytics is not configured")

    overview = ga4_service.get_overview()
    daily = ga4_service.get_daily_visitors()
    active = ga4_service.get_realtime_active_users()
    top_pages = ga4_service.get_top_pages()
    landing_pages = ga4_service.get_landing_pages()

    return _ok({
        **overview,
        "dailyVisitors": daily,
        "activeUsers": active,
        "topPages": top_pages,
        "landingPages": landing_pages,
    })


@router.get("/realtime")
@limiter.limit("30/minute")
async def get_realtime(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback()

    active = ga4_service.get_realtime_active_users()
    return _ok({"activeUsers": active})


@router.get("/countries")
@limiter.limit("30/minute")
async def get_countries(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback()

    return _ok({
        "countries": ga4_service.get_countries(),
        "cities": ga4_service.get_cities(),
    })


@router.get("/devices")
@limiter.limit("30/minute")
async def get_devices(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback()

    return _ok({
        "devices": ga4_service.get_devices(),
        "operatingSystems": ga4_service.get_operating_systems(),
        "browsers": ga4_service.get_browsers(),
    })


@router.get("/traffic-sources")
@limiter.limit("30/minute")
async def get_traffic_sources(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback()

    return _ok({"sources": ga4_service.get_traffic_sources()})
