# ArbiGrow — Oxford Financial Ads

Full-stack investment platform with FastAPI backend, React frontend, PostgreSQL database, and Docker-based deployment.

## Architecture

```
                        ┌─────────────┐
                        │   Internet   │
                        └──────┬──────┘
                               │
                        ┌──────▼──────┐
                        │    Nginx    │  (Reverse Proxy — Port 443)
                        │  (Host OS)  │
                        └──────┬──────┘
                               │
                   ┌───────────┴───────────┐
                   │                       │
            ┌──────▼──────┐        ┌───────▼───────┐
            │   Frontend  │        │    Backend    │
            │  (Docker)   │───────▶│   (Docker)    │
            │  Port 8080  │  /api/ │   Port 8000   │
            └─────────────┘        └───────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
             ┌──────▼──────┐      ┌───────▼───────┐      ┌──────▼──────┐
             │  PostgreSQL │      │     Redis     │      │   Celery    │
             │  (Docker)   │      │   (Docker)    │      │  (Docker)   │
             │   Port 5432 │      │   Port 6379   │      │  Workers    │
             └─────────────┘      └───────────────┘      └─────────────┘
```

### Components

| Component       | Technology                | Docker Container           |
|-----------------|---------------------------|----------------------------|
| Frontend        | React 19, Vite, Tailwind  | `arbigrow-frontend`        |
| Backend         | FastAPI, Python 3.12      | `arbigrow-backend`         |
| Database        | PostgreSQL 16             | `arbigrow-postgres`        |
| Cache           | Redis 7                   | `arbigrow-redis`           |
| Task Queue      | Celery                    | `arbigrow-celery-worker`   |
| Periodic Tasks  | Celery Beat               | `arbigrow-celery-beat`     |
| Monitoring      | Uptime Kuma               | `arbigrow-uptime-kuma`     |
| Reverse Proxy   | Nginx (Host OS)           | N/A                        |

## Folder Structure

```
ProductionBackup/
├── backend/                    # FastAPI backend source
│   ├── app/
│   │   ├── api/v1/            # API endpoints
│   │   ├── core/              # Config, security, database
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   ├── tasks/             # Celery tasks
│   │   └── utils/             # Utility functions
│   ├── alembic/               # Database migrations
│   │   └── versions/          # Migration scripts (70+)
│   ├── scripts/               # Utility scripts
│   ├── Dockerfile             # Multi-stage build
│   ├── requirements.txt       # Python dependencies
│   ├── seed.py                # Database seeder
│   └── run.py                 # Development runner
├── frontend/                   # React frontend source
│   ├── src/
│   │   ├── api/               # API client modules
│   │   ├── assets/            # Images, icons
│   │   ├── component/         # React components
│   │   │   ├── admin/         # Admin dashboard
│   │   │   ├── user/          # User dashboard
│   │   │   └── package/       # Landing page
│   │   ├── i18n/locales/      # Translation files (11 locales)
│   │   ├── page/              # Page components
│   │   ├── store/             # Zustand store
│   │   └── constants/         # Constants
│   ├── public/                # Static assets
│   ├── Dockerfile             # Multi-stage build
│   ├── nginx.conf             # Container nginx config
│   ├── vite.config.js         # Vite build config
│   ├── tailwind.config.js     # Tailwind CSS config
│   └── package.json           # NPM dependencies
├── deployment/                 # Deployment files
│   ├── deploy.sh             # Fresh VPS deployment script
│   ├── backend.service       # Systemd service file
│   └── nginx.conf            # Nginx site configuration
├── docs/
│   ├── database-backup.md    # Database export/restore guide
│   └── final-report.md       # Backup final report
├── scripts/
│   └── (empty — add your helper scripts)
├── backups/
│   ├── config/
│   │   ├── docker-compose.yml
│   │   ├── nginx-site.conf
│   │   ├── postgresql.conf
│   │   └── .env.production
│   ├── storage/
│   │   └── invoices.tar.gz   # Generated invoice PDFs
│   └── database-2026-07-27.dump.gz  # Latest database backup
└── .env.example               # Documented environment variables
```

## Backend Setup

### Prerequisites
- Python 3.12+
- PostgreSQL 16
- Redis 7

### Installation

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set up environment
cp ../.env.example .env
# Edit .env with your configuration

# Run migrations
alembic upgrade heads

# Seed database (optional)
python seed.py

# Start development server
python run.py
```

## Frontend Setup

### Prerequisites
- Node.js 20+

### Installation

```bash
cd frontend
npm ci
npm run dev     # Development server (port 5173)
npm run build   # Production build
```

## Deployment

### Non-Docker (Fresh VPS)

```bash
# Clone repository
git clone <repo-url> /opt/arbigrow
cd /opt/arbigrow

# Configure environment
cp .env.example .env
# Edit .env with production values

# Restore database
# See docs/database-backup.md

# Run deployment script
sudo bash deployment/deploy.sh
```

### Docker (Production — current setup)

```bash
# Build and start all services
docker compose up -d --build

# Run database migrations
docker compose run --rm migrate

# Reload nginx (if config changed)
docker exec arbigrow-frontend nginx -s reload

# View logs
docker compose logs -f backend
```

## Update Process

### Frontend Update

```bash
# 1. Make changes to frontend/src/
# 2. Build new dist
cd frontend && npm run build

# 3. Deploy to Docker
docker cp dist/. arbigrow-frontend:/usr/share/nginx/html/
docker exec arbigrow-frontend nginx -s reload

# Or rebuild entire container
docker compose up -d --build frontend
```

### Backend Update

```bash
# 1. Make changes to backend/
# 2. Rebuild and restart
docker compose up -d --build backend

# 3. Run any new migrations
docker compose run --rm migrate

# 4. Restart celery workers if task code changed
docker compose up -d --build celery-worker celery-beat
```

## Rollback Process

### Rollback Frontend

```bash
# If using Docker build, restore previous image
docker tag arbigrow-frontend:latest arbigrow-frontend:broken
docker tag arbigrow-frontend:previous arbigrow-frontend:latest
docker compose up -d frontend

# Or restore from backup dist
docker cp backup-dist/. arbigrow-frontend:/usr/share/nginx/html/
```

### Rollback Backend

```bash
# Restore previous Docker image
docker tag arbigrow-backend:latest arbigrow-backend:broken
docker tag arbigrow-backend:previous arbigrow-backend:latest
docker compose up -d backend

# Revert database migration if needed
docker exec arbigrow-backend alembic downgrade -1
```

### Full Rollback

```bash
# From production backup directory
# 1. Restore database from dump
# 2. Deploy previous source code
# 3. Rebuild and restart
```

## Common Issues

### "chunk not found" / 404 on JS files
- Browser cached old `index.html` referencing old asset hashes
- Clear browser cache (Ctrl+Shift+R)
- Ensure `Cache-Control: no-store` on `index.html`

### Invoice generation fails
- Check `/app/storage/invoices/` is writable by `appuser` (uid 999)
- Permission should be 777 on the directory
- Check Playwright/Chromium is installed in the container

### Database connection issues
- Verify PostgreSQL container is healthy
- Check `DATABASE_URL` in `.env`
- Ensure `postgres` service is started before backend

### Celery tasks not executing
- Verify Redis is running: `docker exec arbigrow-redis redis-cli ping`
- Check celery worker logs: `docker compose logs celery-worker`
- Restart celery services: `docker compose restart celery-worker celery-beat`

## Troubleshooting

### Check service health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
docker inspect arbigrow-backend --format='{{json .State.Health}}'
```

### View logs
```bash
docker compose logs -f backend          # Backend API
docker compose logs -f frontend         # Frontend Nginx
docker compose logs -f celery-worker    # Celery worker
docker compose logs -f postgres         # Database
tail -f /var/log/nginx/access.log       # Nginx access
tail -f /var/log/nginx/error.log        # Nginx errors
```

### Execute commands in containers
```bash
docker exec -it arbigrow-backend python -c "from app.core.config import settings; print(settings.APP_ENV)"
docker exec -it arbigrow-postgres psql -U postgres -d arbigrow -c "SELECT count(*) FROM users;"
docker exec -it arbigrow-frontend cat /etc/nginx/conf.d/default.conf
```

### Restart services
```bash
docker restart arbigrow-backend
docker restart arbigrow-frontend
docker compose restart
```
