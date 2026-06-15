import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
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
from app.services.investment_service import start_auto_roi_scheduler, stop_auto_roi_scheduler
from app.services.invoice_scheduler import start_invoice_scheduler, stop_invoice_scheduler


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

    await start_auto_roi_scheduler()
    await start_invoice_scheduler()
    yield
    await stop_invoice_scheduler()
    await stop_auto_roi_scheduler()
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

# logger.info(f"ALLOWED_ORIGINS: {settings.ALLOWED_ORIGINS}")

# Serve generated invoice PDFs from local storage
storage_dir = os.path.join(os.path.dirname(__file__), "..", "storage")
os.makedirs(storage_dir, exist_ok=True)
app.mount("/storage", StaticFiles(directory=storage_dir), name="storage")

app.include_router(api_router)
