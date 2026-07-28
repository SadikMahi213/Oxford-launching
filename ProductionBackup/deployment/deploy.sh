#!/usr/bin/env bash
# ─────────────────────────────────────────────────────
# ArbiGrow — Fresh Ubuntu VPS Deployment Script
# ─────────────────────────────────────────────────────
# Usage:
#   1. git clone <repo>
#   2. cp .env.example .env   # Fill in your secrets
#   3. restore database       # See docs/database-backup.md
#   4. sudo bash deploy.sh
# ─────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ───────────────────────────────────
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="${DOMAIN:-oxfordfinancialads.com}"

echo "═══ ArbiGrow Deployment ═══"
echo "App directory: $APP_DIR"

# ── 1. Install System Dependencies ──────────────────
echo "--- Installing system dependencies ---"
apt-get update && apt-get upgrade -y
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    postgresql-16 \
    postgresql-client-16 \
    redis-server

# ── 2. Install Docker ───────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "--- Installing Docker ---"
    curl -fsSL https://get.docker.com | bash
    systemctl enable --now docker
fi

# ── 3. Install Node.js 20 ──────────────────────────
if ! command -v node &> /dev/null; then
    echo "--- Installing Node.js 20 ---"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# ── 4. Setup Backend ────────────────────────────────
echo "--- Setting up backend ---"
cd "$APP_DIR/backend"

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Install Playwright for PDF generation
pip install playwright
python -m playwright install chromium chromium-headless-shell
python -m playwright install-deps chromium chromium-headless-shell

# Run migrations
alembic upgrade heads

# Seed database (if needed)
python seed.py

# ── 5. Setup Frontend ───────────────────────────────
echo "--- Setting up frontend ---"
cd "$APP_DIR/frontend"

npm ci
npm run build

# ── 6. Configure Nginx ──────────────────────────────
echo "--- Configuring Nginx ---"
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;

    client_max_body_size 15M;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend static files
    location /assets/ {
        alias /var/www/$DOMAIN/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        root /var/www/$DOMAIN;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
NGINX

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN

# Create web root and copy built frontend
mkdir -p /var/www/$DOMAIN
cp -r "$APP_DIR/frontend/dist/"* /var/www/$DOMAIN/

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# ── 7. Setup Systemd Service ────────────────────────
echo "--- Setting up systemd service ---"
cp "$APP_DIR/deployment/backend.service" /etc/systemd/system/arbigrow-backend.service
systemctl daemon-reload
systemctl enable --now arbigrow-backend

# ── 8. SSL Certificate (Let's Encrypt) ──────────────
echo "--- Setting up SSL (Let's Encrypt) ---"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || true

# ── 9. Setup Cron Jobs ──────────────────────────────
echo "--- Setting up cron jobs ---"
(crontab -l 2>/dev/null; echo "0 */6 * * * cd $APP_DIR && source backend/venv/bin/activate && python backend/scripts/recalculate_ranks.py >> /var/log/rank_recalc.log 2>&1") | crontab -

# ── 10. Setup Daily Database Backup ─────────────────
echo "--- Setting up daily DB backup ---"
mkdir -p /root/backups
cat > /etc/cron.daily/arbigrow-db-backup << 'CRON'
#!/bin/bash
BACKUP_DIR=/root/backups
DB_NAME=arbigrow
DB_USER=postgres
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
docker exec arbigrow-postgres pg_dump -U $DB_USER -d $DB_NAME --format=custom --compress=9 -f /tmp/arbigrow-backup.dump 2>/dev/null || \
    pg_dump -U $DB_USER -d $DB_NAME --format=custom --compress=9 > $BACKUP_DIR/arbigrow-db-$TIMESTAMP.dump.gz
CRON
chmod +x /etc/cron.daily/arbigrow-db-backup

echo "═══ Deployment Complete ═══"
echo "Frontend: https://$DOMAIN"
echo "Backend API: https://$DOMAIN/api/v1/health"
echo "Admin panel: https://$DOMAIN/admin"
