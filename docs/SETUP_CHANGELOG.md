# Secure PostgreSQL Remote Access — Change Log & Rollback

Date: **2026-08-05**
Scope: Production server `arbigrow-prod` (Ubuntu 24.04.4 LTS, public IP `13.140.175.187`)

## Objective

Allow approved team members to reach the production PostgreSQL database over
a private, encrypted **Tailscale** network — with **zero** public exposure,
**no** data migration, and **no** change to the application's DB credentials.

---

## Changes made

### 1. Tailscale installed and authenticated on the server

- Installed via official script: `curl -fsSL https://tailscale.com/install.sh | sh`
- Version: `1.102.2`
- Service: `tailscaled` enabled + started (`systemctl enable --now tailscaled`)
- Node name: `arbigrow-prod`, Tailscale IP: `100.65.94.73`
- Authenticated to tailnet `sadikmahi213@gmail.com`
- HTTPS Certificates / Tailscale Serve enabled by admin in the admin console

### 2. Dedicated least-privilege DB role created

- Role: `arbigrow_dev`
- Attributes: `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`
- Grants:
  - `CONNECT` on database `arbigrow`
  - `USAGE` on schema `public`
  - `SELECT, INSERT, UPDATE, DELETE` on all tables
  - `USAGE, SELECT` on all sequences
  - `ALTER DEFAULT PRIVILEGES` (same table/sequence rights on future objects)
- Password rotated on 2026-08-05 to a 40-char random alphanumeric value
  (current value in `docs/TEAM_DEV_ACCESS.md`)

### 3. `pg_hba.conf` hardened and reloaded (zero-downtime)

Backup: `/var/lib/postgresql/data/pg_hba.conf.bak20260805`

| Line | Rule | Method |
| ---- | ---- | ------ |
| local | all all | trust |
| host | all all `127.0.0.1/32` | scram-sha-256 *(was trust)* |
| host | all all `::1/128` | scram-sha-256 *(was trust)* |
| host | replication localhost | scram-sha-256 |
| host | arbigrow arbigrow_dev `100.64.0.0/10` | scram-sha-256 |
| host | all all `172.18.0.0/16` | scram-sha-256 |
| ~~host~~ | ~~all all all~~ | ~~removed~~ |

Applied with `pg_reload_conf()` → `t` (no restart; production app stayed up).

### 4. PostgreSQL exposed on loopback only (docker-compose)

- Added to the `postgres` service:
  ```yaml
  ports:
    - "127.0.0.1:5432:5432"
  ```
- Container recreated via `docker compose up -d postgres` (data volume
  `postgres_data` untouched; brief single-container restart).
- Verified `ss -tlnp` → `127.0.0.1:5432` (docker-proxy) only, **no** `0.0.0.0`.
- Compose backups:
  - `/root/backups/tailscale-setup/docker-compose.yml.bak-20260805052451`
  - `/root/backups/tailscale-setup/docker-compose.yml.pre-tunnel`

### 5. Tailscale Serve TCP forwarder

```
tailscale serve --bg --tcp=5432 127.0.0.1:5432
```

Tailnet endpoints (tailnet-only):
- `tcp://100.65.94.73:5432`
- `tcp://arbigrow-prod.taildfff64.ts.net:5432`
- `tcp://[fd7a:115c:a1e0::1e01:5ec2]:5432`

All forward to `tcp://127.0.0.1:5432` (the docker-published postgres).

### 6. Documentation

- `docs/TEAM_DEV_ACCESS.md` — connection guide for team members
- `.env.example`, `arbigrow-fastapi/.env.example` — DATABASE_URL examples updated
  to the tailnet endpoint

### 7. Automated backup & disaster recovery (2026-08-05)

- New backup root: `/root/backups/postgresql/` (daily/weekly/monthly, root-only `700`)
- Scripts:
  - `/usr/local/bin/arbigrow-backup.sh` — pg_dump -Fc → gzip, SHA256, gzip test,
    archive listing, **full restore test into throwaway DB**, weekly/monthly promotion,
    retention pruning (daily 7 / weekly 4 / monthly 12)
  - `/usr/local/bin/arbigrow-backup-offsite.py` — AES-256-CBC encrypts backups and
    uploads to private Backblaze B2 bucket (`backups/YYYY/MM/<tier>/`), size-verified,
    local `.enc` removed
- Cron (`/etc/cron.d/arbigrow-backup`): 03:00 main backup, 03:30 offsite sync
- Security fixes: `/root/.env` chmod `644` → `600`; encryption key
  `/root/backups/.backup_key` (`600`); old backup script archived at
  `/root/backups/tailscale-setup/arbigrow-backup.sh.old-20260805-0745`
- Docs: `docs/BACKUP_RESTORE.md`, `docs/DISASTER_RECOVERY.md`

---

## Verification results (2026-08-05)

| Check | Result |
| ----- | ------ |
| `tailscale serve status` | `tcp://100.65.94.73:5432` → `127.0.0.1:5432` |
| psql via tailnet IP (new password) | ✅ connected, `SELECT` on users = 74 |
| End-to-end from Windows node | ✅ asyncpg connect + query |
| Dev role CRUD (INSERT/UPDATE/SELECT/DELETE) | ✅ granted |
| Dev role TRUNCATE / DROP / CREATE table | ✅ denied |
| Wrong password | ✅ `password authentication failed` |
| Public scan `13.140.175.187:5432` | ✅ timeout (closed/filtered) |
| UFW (22/80/443/3001 only, default deny) | ✅ no 5432 rule |
| Production site `https://oxfordfinancialads.com` | ✅ HTTP 200 |
| Health endpoint `/api/v1/health` | ✅ `{"status":"ok","database":"healthy"}` |
| All containers | ✅ running (postgres healthy) |
| Shared-user psql (friend, `100.108.87.0`) | ✅ connected, `SELECT` on users = 74 |

> **Note on access paths:** the friend was onboarded via Tailscale **node share**
> (not a tailnet member invite). In their `tailscale status`, `arbigrow-prod`
> appears at the shared-node address **`100.108.87.0`** — that is the address
> they connect to. Tailnet members (admin) use the server's own IP `100.65.94.73`.
> `tailscale serve` accepts connections on both paths.

---

## Rollback steps

Run as `root` on the server unless noted.

### 1. Restore original `pg_hba.conf`

```bash
docker exec arbigrow-postgres cp \
  /var/lib/postgresql/data/pg_hba.conf.bak20260805 \
  /var/lib/postgresql/data/pg_hba.conf
docker exec arbigrow-postgres psql -U postgres -d arbigrow \
  -c "SELECT pg_reload_conf();"
```

### 2. Remove loopback port mapping (restores original compose)

```bash
cp /root/backups/tailscale-setup/docker-compose.yml.bak-20260805052451 \
   /root/arbigrow/docker-compose.yml
cd /root/arbigrow && docker compose up -d postgres
```

### 3. Stop the Tailscale serve proxy

```bash
tailscale serve --tcp=5432 off
```

### 4. Drop the dev role (optional)

```bash
docker exec arbigrow-postgres psql -U postgres -d arbigrow \
  -c "REASSIGN OWNED BY arbigrow_dev TO postgres;"
docker exec arbigrow-postgres psql -U postgres -d arbigrow \
  -c "DROP OWNED BY arbigrow_dev;"
docker exec arbigrow-postgres psql -U postgres -d arbigrow \
  -c "DROP ROLE arbigrow_dev;"
```

### 5. Disable / remove Tailscale (optional)

```bash
tailscale serve reset
systemctl disable --now tailscaled
# full removal:
# apt-get purge tailscale
# rm -rf /var/lib/tailscale /var/cache/tailscale
```

### 6. Clean up docs references (optional)

Remove `docs/TEAM_DEV_ACCESS.md` and revert `.env.example` changes.

---

## Files changed / created

| Path | Action |
| ---- | ------ |
| `/root/arbigrow/docker-compose.yml` | modified (postgres ports) |
| `/var/lib/postgresql/data/pg_hba.conf` (container) | modified + reloaded |
| DB role `arbigrow_dev` | created + password rotated |
| `tailscale serve` config | created (`--tcp=5432`) |
| `docs/TEAM_DEV_ACCESS.md` | created |
| `.env.example`, `arbigrow-fastapi/.env.example` | modified |
| Backups | `/root/backups/tailscale-setup/` |
