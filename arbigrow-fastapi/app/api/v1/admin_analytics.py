import logging

from fastapi import APIRouter, Depends, Request
from google.api_core import exceptions as google_exceptions

from app.api.v1.deps import get_current_admin_user
from app.core.rate_limiter import limiter
from app.services.ga4_service import ga4_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


def _ok(data):
    return {"success": True, "data": data}


def _fallback(msg="Analytics not available"):
    return {"success": False, "data": None, "message": msg}


def _handle_ga_error(exc: google_exceptions.GoogleAPIError):
    msg = str(exc)
    logger.warning("GA4 API error: %s", msg)
    if "SERVICE_DISABLED" in msg:
        return _fallback(
            "Google Analytics Data API is not enabled. "
            "Visit https://console.developers.google.com/apis/api/"
            "analyticsdata.googleapis.com/overview?project=oxford-498705 "
            "to enable it."
        )
    if "not found" in msg.lower() or "property" in msg.lower():
        return _fallback("GA4 property not found. Check your Property ID.")
    return _fallback("Google Analytics API error. Check configuration.")


@router.get("/overview")
@limiter.limit("30/minute")
async def get_overview(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback("Google Analytics is not configured")

    try:
        overview = ga4_service.get_overview()
        daily = ga4_service.get_daily_visitors()
        active = ga4_service.get_realtime_active_users()
        top_pages = ga4_service.get_top_pages()
        landing_pages = ga4_service.get_landing_pages()
    except google_exceptions.PermissionDenied as exc:
        return _handle_ga_error(exc)

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
    try:
        active = ga4_service.get_realtime_active_users()
    except google_exceptions.PermissionDenied as exc:
        return _handle_ga_error(exc)
    return _ok({"activeUsers": active})


@router.get("/countries")
@limiter.limit("30/minute")
async def get_countries(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback()
    try:
        countries = ga4_service.get_countries()
        cities = ga4_service.get_cities()
    except google_exceptions.PermissionDenied as exc:
        return _handle_ga_error(exc)
    return _ok({
        "countries": countries,
        "cities": cities,
    })


@router.get("/devices")
@limiter.limit("30/minute")
async def get_devices(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback()
    try:
        devices = ga4_service.get_devices()
        operating_systems = ga4_service.get_operating_systems()
        browsers = ga4_service.get_browsers()
    except google_exceptions.PermissionDenied as exc:
        return _handle_ga_error(exc)
    return _ok({
        "devices": devices,
        "operatingSystems": operating_systems,
        "browsers": browsers,
    })


@router.get("/traffic-sources")
@limiter.limit("30/minute")
async def get_traffic_sources(
    request: Request,
    admin=Depends(get_current_admin_user),
):
    if not ga4_service.enabled:
        return _fallback()
    try:
        sources = ga4_service.get_traffic_sources()
    except google_exceptions.PermissionDenied as exc:
        return _handle_ga_error(exc)
    return _ok({"sources": sources})
