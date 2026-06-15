@echo off
:: ─────────────────────────────────────────────────────
:: Oxford Financial Ads — Development Startup (Windows)
:: ─────────────────────────────────────────────────────
:: Usage:  start-dev.bat
:: ─────────────────────────────────────────────────────

setlocal enabledelayedexpansion
title Oxford Financial Ads Dev

:: ── Color helpers ───────────────────────────────────
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "RESET=[0m"

echo %CYAN%╔══════════════════════════════════════════════════╗%RESET%
echo %CYAN%║        Oxford Financial Ads — Development Environment        ║%RESET%
echo %CYAN%╚══════════════════════════════════════════════════╝%RESET%
echo.

:: ── 1. Check prerequisites ─────────────────────────
echo %YELLOW%[1/5] Checking prerequisites...%RESET%

:: Check Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo %RED%  ✗ Python not found. Please install Python 3.10+ and add it to PATH.%RESET%
    pause
    exit /b 1
)
echo %GREEN%  ✓ Python found%RESET%

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo %RED%  ✗ Node.js not found. Please install Node.js 18+.%RESET%
    pause
    exit /b 1
)
echo %GREEN%  ✓ Node.js found%RESET%

:: ── 2. Set up backend environment ──────────────────
echo.
echo %YELLOW%[2/5] Setting up backend...%RESET%

cd /d "%~dp0arbigrow-fastapi"

:: Create .env from .env.example if it doesn't exist
if not exist .env (
    echo %YELLOW%  Creating .env from .env.example...%RESET%
    copy .env.example .env >nul
    echo %GREEN%  ✓ .env created%RESET%
) else (
    echo %GREEN%  ✓ .env exists%RESET%
)

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo %YELLOW%  Creating virtual environment...%RESET%
    python -m venv venv
    echo %GREEN%  ✓ venv created%RESET%
)

:: Activate and install dependencies
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo %RED%  ✗ Failed to install backend dependencies%RESET%
    pause
    exit /b 1
)
echo %GREEN%  ✓ Backend dependencies installed%RESET%

:: ── 3. Set up frontend environment ─────────────────
echo.
echo %YELLOW%[3/5] Setting up frontend...%RESET%

cd /d "%~dp0ArbiGrow"

:: Create .env from .env.example if it doesn't exist
if not exist .env (
    echo %YELLOW%  Creating .env from .env.example...%RESET%
    copy .env.example .env >nul
    echo %GREEN%  ✓ .env created%RESET%
) else (
    echo %GREEN%  ✓ .env exists%RESET%
)

:: Install frontend dependencies
if not exist node_modules (
    echo %YELLOW%  Installing frontend dependencies...%RESET%
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo %RED%  ✗ Failed to install frontend dependencies%RESET%
        pause
        exit /b 1
    )
    echo %GREEN%  ✓ Frontend dependencies installed%RESET%
) else (
    echo %GREEN%  ✓ node_modules exists%RESET%
)

:: ── 4. Run migrations and seed ─────────────────────
echo.
echo %YELLOW%[4/5] Running database setup...%RESET%

cd /d "%~dp0arbigrow-fastapi"
call venv\Scripts\activate.bat

echo %YELLOW%  Running Alembic migrations...%RESET%
alembic upgrade head
if %ERRORLEVEL% NEQ 0 (
    echo %RED%  ✗ Migration failed. Is PostgreSQL running and configured in .env?%RESET%
    pause
    exit /b 1
)
echo %GREEN%  ✓ Migrations applied%RESET%

echo %YELLOW%  Seeding database...%RESET%
python seed.py
if %ERRORLEVEL% NEQ 0 (
    echo %YELLOW%  Database already seeded (or seed skipped)%RESET%
)
echo %GREEN%  ✓ Database ready%RESET%

:: ── 5. Start services ─────────────────────────────
echo.
echo %YELLOW%[5/5] Starting services...%RESET%

:: Start backend in a new window
echo %YELLOW%  Starting backend on http://localhost:8000...%RESET%
start "OxfordFinancialAds-Backend" cmd /c "cd /d %~dp0arbigrow-fastapi && venv\Scripts\activate.bat && python run.py"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
echo %YELLOW%  Starting frontend on http://localhost:5173...%RESET%
start "OxfordFinancialAds-Frontend" cmd /c "cd /d %~dp0ArbiGrow && npm run dev"

echo.
echo %GREEN%╔══════════════════════════════════════════════════╗%RESET%
echo %GREEN%║        Oxford Financial Ads is starting up!             ║%RESET%
echo %GREEN%╠══════════════════════════════════════════════════╣%RESET%
echo %GREEN%║  Frontend:  http://localhost:5173                ║%RESET%
echo %GREEN%║  Backend:   http://localhost:8000                ║%RESET%
echo %GREEN%║  API Docs:  http://localhost:8000/docs           ║%RESET%
echo %GREEN%╠══════════════════════════════════════════════════╣%RESET%
echo %GREEN%║  Admin Login: admin@oxfordfinancialads.com / Admin@123 ║%RESET%
echo %GREEN%║  Test User:  john@example.com / Test@123        ║%RESET%
echo %GREEN%╚══════════════════════════════════════════════════╝%RESET%
echo.

pause
