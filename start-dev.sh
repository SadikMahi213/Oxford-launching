#!/usr/bin/env bash
# ─────────────────────────────────────────────────────
# Oxford Financial Ads — Development Startup (Linux / macOS)
# ─────────────────────────────────────────────────────
# Usage:  chmod +x start-dev.sh && ./start-dev.sh
# ─────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        Oxford Financial Ads — Development Environment        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Check prerequisites ─────────────────────────
echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}  ✗ Python not found. Please install Python 3.10+.${NC}"
    exit 1
fi
PYTHON=$(command -v python3 || command -v python)
echo -e "${GREEN}  ✓ Python found ($($PYTHON --version))${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}  ✗ Node.js not found. Please install Node.js 18+.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Node.js found ($(node --version))${NC}"

# ── 2. Set up backend environment ──────────────────
echo ""
echo -e "${YELLOW}[2/5] Setting up backend...${NC}"

cd "$SCRIPT_DIR/arbigrow-fastapi"

# Create .env from .env.example if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}  Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}  ✓ .env created${NC}"
else
    echo -e "${GREEN}  ✓ .env exists${NC}"
fi

# Create virtual environment if it doesn't exist
if [ ! -d venv ]; then
    echo -e "${YELLOW}  Creating virtual environment...${NC}"
    $PYTHON -m venv venv
    echo -e "${GREEN}  ✓ venv created${NC}"
fi

# Activate and install dependencies
source venv/bin/activate
pip install -q -r requirements.txt
echo -e "${GREEN}  ✓ Backend dependencies installed${NC}"

# ── 3. Set up frontend environment ─────────────────
echo ""
echo -e "${YELLOW}[3/5] Setting up frontend...${NC}"

cd "$SCRIPT_DIR/ArbiGrow"

# Create .env from .env.example if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}  Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}  ✓ .env created${NC}"
else
    echo -e "${GREEN}  ✓ .env exists${NC}"
fi

# Install frontend dependencies
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}  Installing frontend dependencies...${NC}"
    npm install
    echo -e "${GREEN}  ✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}  ✓ node_modules exists${NC}"
fi

# ── 4. Run migrations and seed ─────────────────────
echo ""
echo -e "${YELLOW}[4/5] Running database setup...${NC}"

cd "$SCRIPT_DIR/arbigrow-fastapi"
source venv/bin/activate

echo -e "${YELLOW}  Running Alembic migrations...${NC}"
alembic upgrade head
echo -e "${GREEN}  ✓ Migrations applied${NC}"

echo -e "${YELLOW}  Seeding database...${NC}"
python seed.py || echo -e "${YELLOW}  Database already seeded (or seed skipped)${NC}"
echo -e "${GREEN}  ✓ Database ready${NC}"

# ── 5. Start services ─────────────────────────────
echo ""
echo -e "${YELLOW}[5/5] Starting services...${NC}"

# Kill any existing processes on our ports
lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true

# Start backend
echo -e "${YELLOW}  Starting backend on http://localhost:8000...${NC}"
cd "$SCRIPT_DIR/arbigrow-fastapi"
source venv/bin/activate
python run.py &
BACKEND_PID=$!

# Wait for backend
sleep 3

# Start frontend
echo -e "${YELLOW}  Starting frontend on http://localhost:5173...${NC}"
cd "$SCRIPT_DIR/ArbiGrow"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Oxford Financial Ads is running!                  ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Frontend:  http://localhost:5173                ║${NC}"
echo -e "${GREEN}║  Backend:   http://localhost:8000                ║${NC}"
echo -e "${GREEN}║  API Docs:  http://localhost:8000/docs           ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Admin Login: admin@oxfordfinancialads.com / Admin@123 ║${NC}"
echo -e "${GREEN}║  Test User:  john@example.com / Test@123        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Press Ctrl+C to stop both services."

# Trap Ctrl+C to clean up
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for both
wait
