# ─────────────────────────────────────────────────────
# ArbiGrow Backend — Dockerfile
# Multi-stage: dev (hot-reload) and prod (optimized)
# ─────────────────────────────────────────────────────

# ── Stage 1: Base ──────────────────────────────────
FROM python:3.12-slim AS base

WORKDIR /app

# System dependencies + security patches
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright + Chromium for PDF generation
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
RUN pip install --no-cache-dir playwright && \
    python -m playwright install chromium chromium-headless-shell && \
    python -m playwright install-deps chromium chromium-headless-shell

COPY . .

# ── Stage 2: Development (hot-reload) ──────────────
FROM base AS dev
ENV RELOAD=true
CMD ["python", "run.py"]

# ── Stage 3: Production (uvicorn) ─────────────────
FROM base AS prod
ENV RELOAD=false
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser && \
    chown -R appuser:appuser /app /app/.cache
EXPOSE 8000
USER appuser
CMD uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${UVICORN_WORKERS:-1}"

# ── Stage 4: Celery Worker ────────────────────────
FROM base AS celery
ENV RELOAD=false
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser && \
    chown -R appuser:appuser /app /app/.cache
USER appuser
CMD celery -A app.core.celery_app worker -l info
