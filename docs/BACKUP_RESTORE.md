# ArbiGrow Backup & Restore Guide

Applies to: production PostgreSQL `arbigrow` on `arbigrow-prod` (Ubuntu 24.04, Docker).
Last updated: 2026-08-05.

---

## 1. Backup location

| Item | Path |
|------|------|
| Root backup dir | `/root/backups/postgresql/` (host filesystem, **outside** the Docker container) |
| Daily | `/root/backups/postgresql/daily/` |
| Weekly | `/root/backups/postgresql/weekly/` |
| Monthly | `/root/backups/postgresql/monthly/` |
| Encryption key | `/root/backups/.backup_key` (mode `600`, used for offsite copies) |
| Backup log | `/var/log/arbigrow-backup.log` |
| Offsite (Backblaze B2, private bucket) | `backups/YYYY/MM/<tier>/<file>.dump.gz.enc` (AES-256-CBC encrypted) |

Permissions: backup dirs are `700` (root only). `/root/.env` is `600`.

Because backups live on the host disk (not inside the postgres container), they
**survive container recreation, PostgreSQL upgrades, and server reboots**.

---

## 2. Filename format

```
arbigrow_YYYY-MM-DD_HH-MM-SS.dump.gz
```

Custom format (`pg_dump -Fc`) compressed with gzip.

---

## 3. Schedule & retention

Runs via `/etc/cron.d/arbigrow-backup`:

| When | Job | Script |
|------|-----|--------|
| Daily 03:00 | Main backup (dump + verify + retention) | `/usr/local/bin/arbigrow-backup.sh` |
| Daily 03:30 | Encrypted offsite sync to B2 | `/usr/local/bin/arbigrow-backup-offsite.py` |

| Tier | Retention | Promoted |
|------|-----------|----------|
| Daily | last **7** copies | every run |
| Weekly | last **4** copies | every Sunday |
| Monthly | last **12** copies | on the 1st of the month |

Expired backups are deleted automatically by the script. On each run the script:
1. Runs `pg_dump -Fc` → gzip → `daily/`.
2. Tests gzip integrity and validates the archive (`pg_restore -l`).
3. **Restores the dump into a throwaway DB** (`arbigrow_verify`), counts tables,
   then drops it — proving the backup is restorable.
4. Records SHA256 + size in the log.
5. Promotes weekly/monthly copies; prunes expired files.

---

## 4. Restore commands

> Restore is done via a **file inside the postgres container** (pg_restore needs a
> seekable file). `--no-owner --no-privileges` avoids superuser/ownership issues
> when the target is the app DB.

### 4.1 Prepare the dump file

```bash
BK=/root/backups/postgresql/daily/arbigrow_2026-08-05_07-44-44.dump.gz
gzip -dc "$BK" > /tmp/db.dump
docker cp /tmp/db.dump arbigrow-postgres:/tmp/db.dump
# cleanup after restore:
docker exec arbigrow-postgres sh -c "rm -f /tmp/db.dump"; rm -f /tmp/db.dump
```

### 4.2 Restore entire database → NEW database (safe / test)

```bash
docker exec arbigrow-postgres createdb -U postgres arbigrow_restore
docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow_restore \
  --no-owner --no-privileges /tmp/db.dump
docker exec arbigrow-postgres psql -U postgres -c "DROP DATABASE arbigrow_restore;"   # when done
```

### 4.3 Restore entire database → PRODUCTION (DR only, overwrites)

```bash
# 1. Stop writes: docker compose stop backend celery-worker celery-beat   (optional)
# 2. Replace production DB:
docker exec arbigrow-postgres psql -U postgres -c "DROP DATABASE arbigrow;"
docker exec arbigrow-postgres createdb -U postgres arbigrow
docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow \
  --no-owner --no-privileges /tmp/db.dump
# 3. Restart app containers.
```

### 4.4 Restore a single table (replace existing)

```bash
docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow \
  --clean --no-owner --no-privileges -t public.users /tmp/db.dump
```
`--clean` drops the existing table before recreating it; omit `--clean` to skip
the table if it already exists.

### 4.5 Restore schema only

```bash
docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow \
  --schema-only --no-owner --no-privileges /tmp/db.dump
```

### 4.6 Restore data only

```bash
docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow \
  --data-only --no-owner --no-privileges /tmp/db.dump
```

### 4.7 Restore from the offsite (encrypted) copy

```bash
# Download (edit object path): backups/2026/08/daily/<file>.dump.gz.enc
python3 - <<'PY'
import boto3
e={}
for l in open('/root/.env'):
    if '=' in l and not l.strip().startswith('#') and l.strip() and not l.strip().startswith('B2_')==False:
        k,v=l.strip().split('=',1); e[k]=v.strip().strip('"')
PY
# (simpler: use the python snippet in the DR doc, or aws cli with B2 endpoint)
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:/root/backups/.backup_key \
  -in <file>.dump.gz.enc -out /tmp/db.dump.gz
gzip -dc /tmp/db.dump.gz > /tmp/db.dump
docker cp /tmp/db.dump arbigrow-postgres:/tmp/db.dump
# then any restore command above
```

---

## 5. Verification

Verify a backup without touching production (same method the automation uses):

```bash
BK=/root/backups/postgresql/daily/arbigrow_2026-08-05_07-44-44.dump.gz
gzip -t "$BK" && echo "gzip OK"
sha256sum "$BK"
gzip -dc "$BK" > /tmp/db.dump
docker cp /tmp/db.dump arbigrow-postgres:/tmp/db.dump
docker exec arbigrow-postgres pg_restore -l /tmp/db.dump | head        # archive listing
docker exec arbigrow-postgres createdb -U postgres arbigrow_verify
docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow_verify \
  --no-owner --no-privileges /tmp/db.dump
docker exec arbigrow-postgres psql -U postgres -d arbigrow_verify -t -A \
  -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
docker exec arbigrow-postgres psql -U postgres -c "DROP DATABASE arbigrow_verify;"
docker exec arbigrow-postgres sh -c "rm -f /tmp/db.dump"; rm -f /tmp/db.dump
```

---

## 6. Security notes

- Backup dirs + `/root/.env` are root-only (`700` / `600`).
- No credentials are embedded in the scripts; dumps run over the container's
  local trust socket, offsite uses `B2_*` read from `/root/.env` at runtime.
- Offsite copies are AES-256-CBC encrypted (`openssl enc -pbkdf2`); the key file
  is root-only. **Keep a backup of `/root/backups/.backup_key` in a safe place
  off-server** or offsite restores are impossible.
- Backups are never publicly exposed; the B2 bucket is private.
