# 🚀 Oxford Financial Ads — AI-Powered Arbitrage Trading Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker)](https://docker.com)

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Local Development (Manual)](#-local-development-manual)
- [Docker Development](#-docker-development)
- [Database Seeder](#-database-seeder)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [VPS Deployment (Ubuntu)](#-vps-deployment-ubuntu)
- [Production Hardening](#-production-hardening)
- [Troubleshooting](#-troubleshooting)

---

## ⚡ Quick Start

### 30-Second Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd ArbiGrow

# 2. Choose your setup method:

# Option A: Docker (recommended — easiest)
docker compose up -d

# Option B: Manual (Windows)
start-dev.bat

# Option C: Manual (Linux/macOS)
chmod +x start-dev.sh
./start-dev.sh
```

### Default Credentials

| Role  | Email                 | Password   |
|-------|-----------------------|------------|
| Admin | admin@oxfordfinancialads.com    | Admin@123  |
| User  | john@example.com      | Test@123   |
| User  | sarah@example.com     | Test@123   |
| User  | michael@example.com   | Test@123   |

---

## 📁 Project Structure

```
ArbiGrow/
├── arbigrow-fastapi/          # Backend (FastAPI + PostgreSQL)
│   ├── alembic/               # Database migrations
│   ├── app/
│   │   ├── api/v1/            # API routes
│   │   ├── core/              # Configuration, security, database
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic services
│   │   └── utils/             # Helper utilities
│   ├── .env.example           # Environment template
│   ├── Dockerfile             # Backend container
│   ├── requirements.txt       # Python dependencies
│   ├── seed.py                # Database seeder
│   └── run.py                 # Development runner
│
├── ArbiGrow/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/               # API client modules
│   │   ├── component/         # Reusable components
│   │   ├── constants/         # Mock data, strategies
│   │   ├── page/              # Page components
│   │   └── store/             # Zustand state management
│   ├── .env.example           # Environment template
│   ├── Dockerfile             # Frontend container
│   └── vite.config.js         # Vite configuration
│
├── docker-compose.yml         # Full Docker stack
├── nginx.conf                 # Production Nginx config
├── start-dev.bat              # Windows startup script
├── start-dev.sh               # Linux/macOS startup script
└── README.md                  # This file
```

---

## ✅ Prerequisites

### Local Development

| Tool          | Version   | Install                                                  |
|---------------|-----------|----------------------------------------------------------|
| Python        | 3.10+     | [python.org](https://python.org)                         |
| Node.js       | 18+       | [nodejs.org](https://nodejs.org)                         |
| PostgreSQL    | 14+       | [postgresql.org/download](https://postgresql.org/download) |
| Git           | —         | [git-scm.com](https://git-scm.com)                       |

### Docker (Alternative)

| Tool   | Version | Install                            |
|--------|---------|-------------------------------------|
| Docker | 24+     | [docker.com](https://docker.com)    |

---

## 🖥️ Local Development (Manual)

### 1. Clone and Set Up

```bash
git clone <your-repo-url>
cd ArbiGrow
```

### 2. Backend Setup

```bash
cd arbigrow-fastapi

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/macOS)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Frontend Setup

```bash
cd ArbiGrow

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### 4. Database Setup

```bash
# Ensure PostgreSQL is running and create the database:
# createdb arbigrow

# Or via psql:
# psql -U postgres -c "CREATE DATABASE arbigrow;"

# Run migrations
cd arbigrow-fastapi
venv\Scripts\activate  # or source venv/bin/activate
alembic upgrade head

# Seed with test data
python seed.py
```

### 5. Start Development Servers

**Terminal 1 — Backend:**
```bash
cd arbigrow-fastapi
venv\Scripts\activate  # or source venv/bin/activate
python run.py
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger UI)
```

**Terminal 2 — Frontend:**
```bash
cd ArbiGrow
npm run dev
# → http://localhost:5173
```

### 6. Using the One-Command Script

**Windows:**
```bash
start-dev.bat
```

**Linux/macOS:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

These scripts automatically:
1. Check prerequisites
2. Create `.env` files if missing
3. Install dependencies
4. Run migrations
5. Seed database (if empty)
6. Start both servers

---

## 🐳 Docker Development

### Start Everything

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** (port 5432)
- **Backend** (port 8000) — automatically runs migrations + seeds
- **Frontend** (port 80) — production build served by Nginx

### Development Mode (Hot Reload)

```bash
# Start with hot-reload for frontend
FRONTEND_TARGET=dev docker compose up -d --build
```

In dev mode, the frontend runs on port 5173 with Vite hot-reload.

### Common Docker Commands

```bash
# Rebuild and restart
docker compose up -d --build

# View logs
docker compose logs -f

# Stop everything
docker compose down

# Stop and delete volumes (reset database)
docker compose down -v

# Run migration/seed separately
docker compose run --rm migrate
```

### Docker Environment Variables

Create a `.env` file in the project root to override defaults:

```env
# docker-compose.yml uses these
SECRET_KEY=your-production-secret-key
```

---

## 🌱 Database Seeder

### Usage

```bash
cd arbigrow-fastapi

# Seed with default data (skips if data exists)
python seed.py

# Force re-seed (drops all data first)
python seed.py --force

# Seed with more users
python seed.py --users 50
```

### What Gets Seeded

| Entity            | Records Created                        |
|-------------------|----------------------------------------|
| Users             | 15 test users + 1 admin               |
| KYC Records       | ~7 approved/pending verifications      |
| Deposit Networks  | 4 networks (TRC20, ERC20, BTC, ETH)   |
| Deposits          | 1-3 per non-admin user                |
| Investments       | 1-3 per non-admin user                |
| Profit History    | Daily profit credits for active investments |
| ROI Settings      | Global + per-package scheduled rates  |
| Platform Stats    | Aggregate platform statistics         |
| Announcements     | 4 sample announcements                |

### Referral Chain

Users are linked in a simple referral chain:
- User 0 (Admin) → No referrer
- User 1 → Referred by Admin
- User 2 → Referred by User 1
- ...and so on (up to 5 levels deep)

---

## 🔐 Environment Variables

### Backend (`arbigrow-fastapi/.env`)

| Variable                  | Description                              | Default                        |
|---------------------------|------------------------------------------|--------------------------------|
| `DATABASE_URL`            | PostgreSQL connection string             | `postgresql+asyncpg://...`     |
| `SECRET_KEY`              | JWT signing secret                       | (required)                     |
| `ALGORITHM`               | JWT algorithm                            | `HS256`                        |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry                         | `7200`                         |
| `ALLOWED_ORIGINS`         | CORS allowed origins (comma-separated)   | `http://localhost:5173,...`    |
| `APP_ENV`                 | Environment name                         | `development`                  |
| `LOG_LEVEL`               | Logging level                            | `INFO`                         |
| `FRONTEND_DOMAIN`         | Frontend URL for email links             | `http://localhost:5173`        |
| `DB_SSL_REQUIRED`         | Enable SSL for database connection       | `false`                        |
| `MAIL_*`                  | SMTP email configuration                 | Optional                       |
| `B2_*`                    | Backblaze B2 file storage                | Optional                       |
| `AUTO_ROI_ENABLED`        | Enable automatic ROI scheduler           | `true`                         |

### Frontend (`ArbiGrow/.env`)

| Variable           | Description           | Default                   |
|--------------------|-----------------------|---------------------------|
| `VITE_BACKEND_URL` | Backend API base URL  | `http://localhost:8000`    |
| `VITE_APP_NAME`    | Application name      | `Oxford Financial Ads`     |

---

## 📚 API Documentation

Once the backend is running:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Health Check

```bash
curl http://localhost:8000/api/v1/health
# → {"status":"ok","database":"healthy"}
```

---

## ☁️ VPS Deployment (Ubuntu)

### Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect

# Install Git
sudo apt install git -y
```

### Deploy the Application

```bash
# Clone repository
git clone <your-repo-url> /opt/arbigrow
cd /opt/arbigrow

# Create production .env
cat > .env << 'EOF'
SECRET_KEY=$(openssl rand -hex 32)
EOF

# Start services
docker compose up -d --build

# Check status
docker compose ps
```

### Configure Domain & SSL (Nginx Reverse Proxy)

```bash
# Install Nginx
sudo apt install nginx -y

# Create site configuration
sudo nano /etc/nginx/sites-available/arbigrow
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/arbigrow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL with Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

### PostgreSQL Backup Strategy

```bash
# Create backup script
cat > /opt/arbigrow/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/backups/arbigrow"
mkdir -p $BACKUP_DIR
docker exec arbigrow-postgres pg_dump -U postgres arbigrow | gzip > "$BACKUP_DIR/arbigrow-$(date +%Y%m%d-%H%M%S).sql.gz"
# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
SCRIPT
chmod +x /opt/arbigrow/backup.sh

# Add to crontab (daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/arbigrow/backup.sh") | crontab -
```

### Systemd Service (Alternative to Docker)

If you prefer running without Docker, create a systemd service:

```ini
[Unit]
Description=Oxford Financial Ads Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/arbigrow/arbigrow-fastapi
Environment=DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/arbigrow
Environment=SECRET_KEY=your-production-secret
ExecStart=/opt/arbigrow/arbigrow-fastapi/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## 🔒 Production Hardening

### Security

- [ ] Use strong `SECRET_KEY` (generated via `openssl rand -hex 32`)
- [ ] Set `DB_SSL_REQUIRED=true` for cloud databases
- [ ] Restrict `ALLOWED_ORIGINS` to your actual domain
- [ ] Enable rate limiting (already configured)
- [ ] Use environment-specific `.env` files (never commit secrets)
- [ ] Set `APP_ENV=production`
- [ ] Use HTTPS via Let's Encrypt / Certbot

### Performance

- [ ] Increase `--workers` in production (4 per CPU core recommended)
- [ ] Set up PostgreSQL connection pooling (PgBouncer)
- [ ] Configure Redis for caching (future enhancement)
- [ ] Enable CDN for static assets
- [ ] Database indexing (already configured on key columns)

### Monitoring

- Health endpoint: `GET /api/v1/health`
- Structured logging (JSON format recommended in production)
- Consider: Sentry, Grafana + Prometheus, Uptime Kuma

---

## 🔧 Troubleshooting

### "Cannot connect to database"

```bash
# Check if PostgreSQL is running
pg_isready

# Verify connection string in .env
# Should look like: postgresql+asyncpg://user:password@localhost:5432/arbigrow

# For Docker: check logs
docker compose logs postgres
```

### Alembic migration fails

```bash
# Reset migrations and try again
alembic downgrade base
alembic upgrade head
```

### "Module not found" errors

```bash
# Backend: ensure venv is activated and requirements are installed
pip install -r requirements.txt

# Frontend: ensure node_modules exists
npm install
```

### Port already in use

```bash
# On Linux/macOS
lsof -ti:8000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# On Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
```

### Docker: Volume permission issues

```bash
# Fix PostgreSQL data directory permissions
sudo chown -R 999:999 /var/lib/docker/volumes/arbigrow_postgres_data/
```

---

## 📄 License

Copyright © 2024, Oxford Financial Ads. All rights reserved.
