# Disaster Recovery Plan — ArbiGrow

Recovery playbooks for production database incidents. Backups live on the host
(`/root/backups/postgresql/`) and encrypted offsite (Backblaze B2). See
`BACKUP_RESTORE.md` for the full command reference.

## Recovery target

| Tier | Copies | Max data loss (RPO) | Recovery time (RTO) |
|------|--------|---------------------|---------------------|
| Local daily | 7 | up to ~24 h | minutes |
| Local weekly | 4 | up to 7 days | minutes |
| Local monthly | 12 | up to 1 month | minutes |
| Offsite (B2, encrypted) | all tiers | same as above | minutes + download |

> ⚠ This is a **logical backup** strategy (`pg_dump`). It is NOT point-in-time
> recovery — changes made after the last dump are lost. For stricter RPO,
> enable WAL archiving (`archive_mode=on` + B2/S3 archiving) as a follow-up.

---

## Playbook A — Developer accidentally deleted data

**Situation:** someone ran `DELETE FROM users WHERE ...` or dropped a table's rows.

1. Identify the latest backup that still contains the data:
   ```bash
   ls -lt /root/backups/postgresql/daily/
   ```
2. Restore **that table only** into production (replaces the table, keeps everything else untouched):
   ```bash
   BK=/root/backups/postgresql/daily/<pick>.dump.gz
   gzip -dc "$BK" > /tmp/db.dump
   docker cp /tmp/db.dump arbigrow-postgres:/tmp/db.dump
   docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow \
     --clean --no-owner --no-privileges -t public.<table_name> /tmp/db.dump
   docker exec arbigrow-postgres sh -c "rm -f /tmp/db.dump"; rm -f /tmp/db.dump
   ```
3. Verify row counts returned to expected values.
4. If multiple tables were affected, restore each, or do a full restore (Playbook D).

> If the developer's bad SQL was just committed in a **transaction they haven't
> committed**, you can kill it instead:
> ```sql
> SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <pid>;
> ```
> (active transaction rolls back; committed changes need a restore).

## Playbook B — Developer corrupted data (bad UPDATE)

Same as Playbook A but with `UPDATE`. Restore the affected tables from the last
good backup, or a full restore if corruption spread. Then `REVOKE` the developer's
write access (or switch them to a read-only role) before they resume.

## Playbook C — Developer ran wrong SQL (schema change / wrong query)

- If it was **committed** and touched data → Playbook A/B with the affected tables.
- If it was a **schema change** (e.g. dropped a column) → the table restore with
  `--clean` from a backup taken before the change will recreate the table with the
  original schema + data.
- If the schema is now unusable app-wide → full restore (Playbook D).
- Stop writes first so the restore isn't racing the app:
  ```bash
  cd /root/arbigrow && docker compose stop backend celery-worker celery-beat
  # ... restore ...
  docker compose start backend celery-worker celery-beat
  ```

## Playbook D — Full restore / failed deployment

**Situation:** app is broken because of bad migrations/deploy and you need the DB
back to a known-good point.

1. Stop the app containers (prevents writes during restore):
   ```bash
   cd /root/arbigrow && docker compose stop backend celery-worker celery-beat
   ```
2. Restore the full database (drops + recreates `arbigrow`):
   ```bash
   BK=/root/backups/postgresql/daily/<pick>.dump.gz
   gzip -dc "$BK" > /tmp/db.dump
   docker cp /tmp/db.dump arbigrow-postgres:/tmp/db.dump
   docker exec arbigrow-postgres psql -U postgres -c "DROP DATABASE arbigrow;"
   docker exec arbigrow-postgres createdb -U postgres arbigrow
   docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow \
     --no-owner --no-privileges /tmp/db.dump
   docker exec arbigrow-postgres sh -c "rm -f /tmp/db.dump"; rm -f /tmp/db.dump
   ```
3. Start the app and verify:
   ```bash
   docker compose start backend celery-worker celery-beat
   curl -s https://oxfordfinancialads.com/api/v1/health   # expect database:healthy
   docker ps
   ```

## Playbook E — Server / disk failure (DR)

**Situation:** the server is gone or the disk is dead; only the offsite copy exists.

1. Rebuild the server (or use a standby), install Docker + Tailscale, deploy the
   same `docker-compose.yml`.
2. Download the encrypted backups from B2:
   ```bash
   python3 - <<'PY'
   import boto3
   env={}
   for l in open('/root/.env'):
       l=l.strip()
       if l and not l.startswith('#') and '=' in l:
           k,v=l.split('=',1); env[k]=v.strip().strip('"').strip("'")
   s3=boto3.client('s3', endpoint_url=env['B2_ENDPOINT'],
       aws_access_key_id=env['B2_KEY_ID'],
       aws_secret_access_key=env['B2_APPLICATION_KEY'], region_name='us-west-002')
   # list objects:
   objs=s3.list_objects_v2(Bucket=env['B2_BUCKET_NAME'], Prefix='backups/')['Contents']
   for o in sorted(objs, key=lambda x:x['LastModified']): print(o['Key'])
   PY
   ```
   (Use the last good `daily`, or any `weekly`/`monthly`.)
3. Decrypt with the saved key and restore into the fresh postgres (Playbook D steps).

> **Key requirement:** `/root/backups/.backup_key` must have been copied off-server
> (safe place with the business owner) — otherwise the encrypted offsite copies
> cannot be decrypted.

## Emergency contact & rollback order

1. **Data incident** → stop writes → restore affected table(s) from the newest
   local backup → verify → re-enable.
2. **If local backups are also gone** → go straight to B2 (Playbook E) — only the
   most recent **successful** offsite sync (03:30) is available.

## Tested 2026-08-05

- ✅ Manual full backup created, SHA256 recorded, archive listing OK.
- ✅ Full restore into throwaway DB — 72 tables, `users` = 74 rows.
- ✅ Offsite upload to B2 (encrypted), object size verified.
- ✅ Offsite round-trip: downloaded → decrypted → SHA256 **matches** local copy.
- ✅ No leftover temp databases/files after verification runs.
