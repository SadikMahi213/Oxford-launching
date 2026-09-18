#!/bin/bash
set -euo pipefail

echo "=== Deploy Invoice Transaction ID System ==="
ROOT=/root/ArbiGrow
BE=$ROOT/arbigrow-fastapi
FE=$ROOT/ArbiGrow

# 1. Pull latest code from GitHub
echo "[1/4] Pulling latest..."
cd "$ROOT"
git pull origin main --ff-only

# 2. Run migration
echo "[2/4] Running Alembic migration..."
cd "$BE"
alembic upgrade head

# 3. Rebuild frontend
echo "[3/4] Building frontend..."
cd "$FE"
npm run build

# 4. Rebuild container and restart
echo "[4/4] Rebuilding container..."
cd "$ROOT"
docker compose build --no-cache arbigrow-fastapi
docker compose up -d --no-deps arbigrow-fastapi

echo "Waiting for health check..."
for i in $(seq 1 30); do
    if curl -sf https://oxfordfinancialads.com/v1/health > /dev/null 2>&1; then
        echo "  Healthy after ${i}s"
        break
    fi
    sleep 1
done
echo "=== Deploy complete ==="
