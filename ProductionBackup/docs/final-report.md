# ArbiGrow — Production Backup Final Report

**Date**: 2026-07-27
**Server**: 13.140.175.187
**Domain**: oxfordfinancialads.com

---

## ✔ Folder Structure

```
G:\Oxforf\ArbiGrow\ProductionBackup\
├── backend/              # 243 files — FastAPI backend source
│   ├── app/
│   │   ├── api/v1/       # 30 API endpoint modules
│   │   ├── core/         # 10 core modules (config, security, db, etc.)
│   │   ├── models/       # 52 SQLAlchemy models
│   │   ├── schemas/      # 12 Pydantic schemas
│   │   ├── services/     # 9 service modules
│   │   ├── tasks/        # 2 Celery task modules
│   │   └── utils/        # 10 utility modules
│   ├── alembic/          # 74 migration scripts
│   ├── scripts/          # 1 utility script (recalculate_ranks)
│   ├── Dockerfile        # Multi-stage (dev/prod/celery)
│   └── requirements.txt  # 50+ Python dependencies
├── frontend/             # 218 files — React frontend source
│   ├── src/
│   │   ├── api/          # 9 API client modules
│   │   ├── assets/       # 12 image assets
│   │   ├── component/    # 80+ React components
│   │   │   ├── admin/    # 30+ admin dashboard components
│   │   │   ├── user/     # 30+ user dashboard components
│   │   │   └── ...       # Landing, package, common components
│   │   ├── i18n/         # 11 locale translation files
│   │   ├── page/         # 16 page components
│   │   └── store/        # Zustand store
│   ├── public/           # 10 static assets (images, PDFs)
│   ├── Dockerfile        # Multi-stage (dev/prod with Nginx)
│   ├── nginx.conf        # Container Nginx config
│   └── package.json      # 15 dependencies
├── deployment/           # Deployment files
│   ├── deploy.sh         # Fresh VPS deployment script
│   ├── backend.service   # Systemd unit file
│   └── nginx.conf        # Standalone Nginx site config
├── docs/                 # Documentation
│   ├── database-backup.md
│   └── final-report.md
├── scripts/              # (empty — reserved for helpers)
├── backups/
│   ├── config/           # Production config files
│   │   ├── docker-compose.yml
│   │   ├── nginx-site.conf
│   │   ├── postgresql.conf
│   │   └── .env.production
│   ├── storage/
│   │   └── invoices.tar.gz  # 57 MB — Generated invoice PDFs
│   └── database-2026-07-27.dump.gz  # 149 KB — PostgreSQL dump
├── .env.example          # Documented environment variables
├── backend-source.tar.gz # Raw backend archive (source of truth)
├── frontend-source.tar.gz # Raw frontend archive (source of truth)
└── README.md             # Full project documentation
```

## ✔ Files Backed Up

| Category          | Count | Details                                    |
|-------------------|-------|--------------------------------------------|
| Backend Python    | 243   | All .py source, configs, Dockerfile, etc. |
| Frontend JSX/CSS  | 218   | All .jsx, .js, .json, .css, configs       |
| Config files      | 4     | docker-compose, nginx, postgresql, .env   |
| Database backup   | 1     | Latest daily dump (2026-07-27)             |
| Invoice PDFs      | ~500  | ~57 MB of generated invoice PDFs           |
| SSL cert info     | N/A   | Fullchain path documented, keys excluded   |

## ✔ Files Intentionally Excluded

| Excluded Item          | Reason                                      |
|------------------------|---------------------------------------------|
| `__pycache__/`         | Compiled Python bytecode (auto-generated)   |
| `*.pyc`                | Compiled Python (auto-generated)            |
| `.venv/`, `venv/`      | Virtual environment (regeneratable)         |
| `node_modules/`        | NPM packages (regeneratable with `npm ci`)  |
| `dist/`                | Frontend build output (regeneratable)       |
| `logs/`                | Log files (not needed for deployment)       |
| Docker images          | Can be rebuilt from Dockerfiles             |
| SSL private keys       | Security — not exported                     |
| `*.tar.gz`, `*.tar`    | Build artifacts, backup archives            |
| `SendFunds-built.js`   | Compiled JS file (source is in src/)        |
| Temporary scripts      | Fix scripts, test scripts, query scripts    |

## ✔ Environment Variables Detected

| Variable                        | Source     | Required | Description                              |
|---------------------------------|------------|----------|------------------------------------------|
| `DATABASE_URL`                  | env,compose| ✅       | PostgreSQL connection string (asyncpg)   |
| `SECRET_KEY`                    | .env       | ✅       | JWT signing key (32+ chars)              |
| `ALGORITHM`                     | Config     | ✅       | JWT algorithm (HS256)                    |
| `ACCESS_TOKEN_EXPIRE_MINUTES`   | Config     | ✅       | JWT access token lifetime                |
| `REFRESH_TOKEN_EXPIRE_DAYS`     | Config     | ✅       | JWT refresh token lifetime               |
| `ALLOWED_ORIGINS`               | Config     | ✅       | CORS allowed origins (JSON array)        |
| `APP_ENV`                       | Config     | ✅       | Environment name (production)            |
| `LOG_LEVEL`                     | Config     | ✅       | Logging level (INFO)                     |
| `FRONTEND_DOMAIN`               | Config     | ✅       | Frontend URL for emails/links            |
| `DB_SSL_REQUIRED`               | Config     | ❌       | PostgreSQL SSL requirement               |
| `DB_POOL_SIZE`                  | Config     | ❌       | Database connection pool size            |
| `DB_MAX_OVERFLOW`               | Config     | ❌       | Max pool overflow connections            |
| `MAIL_USERNAME`                 | Config     | ❌       | SMTP username                            |
| `MAIL_PASSWORD`                 | Config     | ❌       | SMTP password                            |
| `MAIL_FROM`                     | Config     | ❌       | SMTP from address                        |
| `MAIL_PORT`                     | Config     | ❌       | SMTP port (587)                          |
| `MAIL_SERVER`                   | Config     | ❌       | SMTP server (smtp.gmail.com)             |
| `MAIL_FROM_NAME`                | Config     | ❌       | Email sender name                        |
| `MAIL_STARTTLS`                 | Config     | ❌       | SMTP STARTTLS flag                       |
| `MAIL_SSL_TLS`                  | Config     | ❌       | SMTP SSL/TLS flag                        |
| `B2_ENDPOINT`                   | .env       | ❌       | Backblaze B2 S3 endpoint                 |
| `B2_KEY_ID`                     | .env       | ❌       | B2 access key ID                         |
| `B2_APPLICATION_KEY`            | .env       | ❌       | B2 secret application key                |
| `B2_BUCKET_NAME`                | .env       | ❌       | B2 bucket name (Oxford-ads)              |
| `AUTO_ROI_ENABLED`              | Config     | ❌       | Enable automatic ROI calculation         |
| `AUTO_ROI_POLL_SECONDS`         | Config     | ❌       | ROI calculation interval                 |
| `REDIS_URL`                     | Config     | ❌       | Redis connection URL                     |
| `SESSION_TIMEOUT_MINUTES`       | Config     | ❌       | Session timeout                          |
| `REMEMBER_ME_DAYS`              | Config     | ❌       | Remember-me token lifetime               |
| `GOOGLE_ANALYTICS_CREDENTIALS`  | .env       | ❌       | GA service account JSON (base64)         |
| `GOOGLE_ANALYTICS_PROPERTY_ID`  | .env       | ❌       | GA4 property ID                          |
| `MAX_FAILED_ATTEMPTS`           | Config     | ❌       | Login lockout threshold                  |
| `SECURITY_LOG_ENABLED`          | Config     | ❌       | Security event logging                   |
| `POSTGRES_PASSWORD`             | compose    | ✅       | PostgreSQL password                      |
| `VITE_BACKEND_URL`              | compose    | ✅       | Backend URL for frontend build           |

**Total: 34 environment variables identified**

## ✔ Deployment Files Generated

| File                    | Purpose                                  |
|-------------------------|------------------------------------------|
| `deployment/deploy.sh`  | Fresh VPS one-command deployment script  |
| `deployment/backend.service` | Systemd unit for FastAPI backend    |
| `deployment/nginx.conf` | Standalone Nginx site configuration      |
| `docs/database-backup.md` | Database export/restore guide          |
| `.env.example`          | Documented template with all variables   |
| `README.md`             | Full project documentation               |

## ✔ Database Type

- **System**: PostgreSQL 16 (Alpine)
- **Container**: `arbigrow-postgres` (image: `postgres:16-alpine`)
- **Size**: 16 MB (currently small dataset)
- **Tables**: 66 tables
- **Daily Backup**: Automated at 03:00 UTC via pg_dump custom format

## ✔ Storage Locations

| Location                     | Contents                      | Size    |
|------------------------------|-------------------------------|---------|
| `/root/ArbiGrow/storage/invoices/` | Generated invoice PDFs       | ~57 MB  |
| `/var/lib/docker/volumes/arbigrow_postgres_data/` | PostgreSQL data volume | N/A     |
| Docker container: `/app/storage/` | Backend storage inside container | Shared via bind mount |

## ✔ Services Detected

| Service                  | Type        | Status    | Port(s)             |
|--------------------------|-------------|-----------|---------------------|
| Nginx (Host OS)          | Reverse Proxy | Running  | 80, 443             |
| Docker                   | Container Runtime | Running | Socket             |
| `arbigrow-frontend`      | Docker      | Up 2 days | 127.0.0.1:8080→80   |
| `arbigrow-backend`       | Docker      | Up 45 min | 127.0.0.1:8000→8000 |
| `arbigrow-postgres`      | Docker      | Up 2 days | 5432 (internal)     |
| `arbigrow-redis`         | Docker      | Up 2 weeks | 6379 (internal)     |
| `arbigrow-celery-worker` | Docker      | Up 2 days | N/A                 |
| `arbigrow-celery-beat`   | Docker      | Up 2 days | N/A                 |
| `arbigrow-uptime-kuma`   | Docker      | Up 8 days | 127.0.0.1:3001      |
| Cron                     | System      | Active    | N/A                 |

## ✔ Nginx Configuration

**Host-level Nginx** (`/etc/nginx/sites-available/oxfordfinancialads.com`):
- HTTP → HTTPS redirect for `oxfordfinancialads.com` and `www.oxfordfinancialads.com`
- SSL with Let's Encrypt certificate (expires 2026-09-16)
- All traffic proxied to `127.0.0.1:8080` (frontend Docker container)
- `client_max_body_size`: 15 MB
- IP direct access (port 80) also proxied to frontend

**Container-level Nginx** (`/root/ArbiGrow/ArbiGrow/nginx.conf`):
- Serves static assets with 1-year immutable cache
- Proxies `/api/` to `backend:8000` (Docker network)
- Rate limiting: 30 req/s burst 50 on API
- SPA fallback to `index.html`
- Security headers (HSTS, X-Frame-Options, etc.)

## ⚠ Potential Deployment Risks

| Risk                            | Severity | Mitigation                                      |
|---------------------------------|----------|-------------------------------------------------|
| SSL certificates expire         | High     | Certbot auto-renewal; cert valid until Sep 2026 |
| Database credentials in .env    | Medium   | Use environment-specific .env files; rotate periodically |
| No DB connection pooling tuning | Low      | Default pool settings may need adjustment under load |
| Docker without orchestration    | Low      | Single-host; consider Docker Swarm for multi-host |
| B2 credentials exposed in backup | Medium  | **CRITICAL**: Backup .env file contains real secrets — store securely |
| Google Analytics credentials    | Medium   | Base64-encoded service account JSON in .env     |
| No monitoring/alerts            | Medium   | Uptime Kuma running but no alerting configured  |
| Disk 76% full (54/72 GB)        | Medium   | Monitor disk usage; clean old backups and logs  |
| No automated restore testing    | Medium   | Periodically test restore process on staging    |
| No redundancy for PostgreSQL    | High     | Single-instance; no replication or failover     |

## Summary

This backup contains everything needed to restore the full ArbiGrow application:

1. **Source code** — Both backend (FastAPI) and frontend (React)
2. **Database** — Latest PostgreSQL dump with 66 tables
3. **Configuration** — All nginx, docker-compose, postgresql configs
4. **Storage** — Generated invoice PDFs
5. **Deployment** — One-click deploy script for fresh VPS
6. **Documentation** — Full README, DB restore guide, env documentation

**To deploy on a fresh VPS:**
```bash
git clone <repo>
cp .env.example .env          # Edit with production values
# Restore database from backup
sudo bash deployment/deploy.sh
```
