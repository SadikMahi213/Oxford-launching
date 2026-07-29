#!/bin/bash
set -euo pipefail

echo "=== Deploying Invoice Transaction ID System ==="

cd /root/ArbiGrow

# 1. Pull latest code from GitHub
echo "[1/6] Pulling latest code..."
cd arbigrow-fastapi
git pull origin main --ff-only
cd /root/ArbiGrow

# 2. Run Alembic migration
echo "[2/6] Running database migration..."
cd arbigrow-fastapi
alembic upgrade head
cd /root/ArbiGrow

# 3. Rebuild frontend
echo "[3/6] Building frontend..."
cd ArbiGrow
npm run build
cd /root/ArbiGrow

# 4. Rebuild and restart containers
echo "[4/6] Rebuilding Docker containers..."
docker compose build --no-cache arbigrow-fastapi
docker compose up -d --no-deps arbigrow-fastapi

# 5. Wait for backend health
echo "[5/6] Waiting for backend health..."
for i in $(seq 1 30); do
    if curl -sf https://oxfordfinancialads.com/v1/health > /dev/null 2>&1; then
        echo "  Backend is healthy after ${i}s"
        break
    fi
    sleep 1
done

# 6. Verify transaction_id field
echo "[6/6] Verifying invoice transaction_id..."
TOKEN=$(curl -sf -X POST https://oxfordfinancialads.com/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@oxfordfinancialads.com","password":"admin123"}' 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

if [ -n "$TOKEN" ]; then
    RESULT=$(curl -sf https://oxfordfinancialads.com/v1/invoice/my \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null \
        | python3 -c "import sys,json; d=json.load(sys.stdin); inv=d.get('invoices',[]); print(f'Invoices: {len(inv)}, has transaction_id: {bool(inv and inv[0].get(\"transaction_id\"))}')" 2>/dev/null)
    echo "  $RESULT"
fi

echo ""
echo "=== Deploy complete ==="
