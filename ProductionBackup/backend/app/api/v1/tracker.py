from fastapi import APIRouter, Request
import uuid

from app.services.analytics_service import (
    log_visit_async,
    parse_user_agent,
    determine_traffic_source,
)

router = APIRouter(prefix="/track", tags=["Visitor Tracking"])


@router.get("/pixel.gif")
@router.get("/pixel")
async def tracking_pixel(request: Request):
    ua = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")
    ip = request.client.host if request.client else "0.0.0.0"

    if request.headers.get("x-forwarded-for"):
        ip = request.headers["x-forwarded-for"].split(",")[0].strip()

    session_id = request.cookies.get("visitor_session")
    new_session = False
    if not session_id:
        session_id = uuid.uuid4().hex[:64]
        new_session = True

    page_url = request.query_params.get("url", "")
    parsed = parse_user_agent(ua)
    source = determine_traffic_source(referrer)

    import asyncio
    asyncio.create_task(
        log_visit_async(
            session_id=session_id,
            ip_address=ip,
            user_agent=ua,
            device_type=parsed["device_type"],
            os=parsed["os"],
            browser=parsed["browser"],
            traffic_source=source,
            referrer_url=referrer or None,
            page_url=page_url,
        )
    )

    from fastapi.responses import Response
    resp = Response(content="", media_type="image/gif")
    if new_session:
        resp.set_cookie(
            key="visitor_session",
            value=session_id,
            max_age=1800,
            httponly=True,
            samesite="lax",
        )
    return resp
