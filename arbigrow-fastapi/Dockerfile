# ─────────────────────────────────────────────────────
# ArbiGrow Backend — Dockerfile
# Multi-stage: dev (hot-reload) and prod (optimized)
# ─────────────────────────────────────────────────────

# ── Stage 1: Base ──────────────────────────────────
FROM python:3.12-slim AS base

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ── Stage 2: Development (hot-reload) ──────────────
FROM base AS dev
ENV RELOAD=true
CMD ["python", "run.py"]

# ── Stage 3: Production (gunicorn + uvicorn) ──────
FROM base AS prod
ENV RELOAD=false
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
