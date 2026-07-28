import sys
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
import time

import logging

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.api.router import api_router
from app.core.logger import setup_logging
from app.core.database import check_db_connection
from app.core.redis import init_redis, close_redis
from app.services.invoice_scheduler import start_invoice_scheduler, stop_invoice_scheduler
from app.services.analytics_service import (
    log_visit_async,
    parse_user_agent,
    determine_traffic_source,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup validation: verify database is reachable
    logger = logging.getLogger(__name__)
    logger.info("Starting Oxford Financial Ads Backend...")
    logger.info(f"Environment: {settings.APP_ENV}")
    try:
        await check_db_connection()
        logger.info("Database connection OK")
    except Exception as e:
        logger.critical(f"Database connection FAILED: {e}")
        logger.critical("Application will exit — fix your DATABASE_URL or ensure PostgreSQL is running.")
        sys.exit(1)

    redis_ok = await init_redis()
    if redis_ok:
        logger.info("Redis cache connected")
    else:
        logger.warning("Redis unavailable — using in-memory cache only")

    await start_invoice_scheduler()
    yield
    await stop_invoice_scheduler()
    await close_redis()
    logger.info("Oxford Financial Ads Backend shutting down.")


app = FastAPI(
    title="Oxford Financial Ads Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# setup logging
setup_logging()
logger = logging.getLogger(__name__)

#  setup rate limiter
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    duration = round((time.time() - start_time) * 1000, 2)

    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} "
        f"time={duration}ms"
    )

    return response


_STATIC_EXTENSIONS = frozenset({
    ".js", ".css", ".png", ".jpg", ".jpeg",
    ".gif", ".svg", ".webp", ".ico", ".woff",
    ".woff2", ".ttf", ".eot", ".map",
})


@app.middleware("http")
async def track_visitors(request: Request, call_next):
    path = request.url.path

    if request.method != "GET":
        return await call_next(request)

    if path.startswith("/storage/") or path.startswith("/api/"):
        return await call_next(request)

    _, ext = os.path.splitext(path)
    if ext in _STATIC_EXTENSIONS:
        return await call_next(request)

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

    parsed = parse_user_agent(ua)
    source = determine_traffic_source(referrer)
    page_url = str(request.url)

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

    response = await call_next(request)

    if new_session:
        response.set_cookie(
            key="visitor_session",
            value=session_id,
            max_age=1800,
            httponly=True,
            samesite="lax",
        )

    return response

# logger.info(f"ALLOWED_ORIGINS: {settings.ALLOWED_ORIGINS}")

app.include_router(api_router)
