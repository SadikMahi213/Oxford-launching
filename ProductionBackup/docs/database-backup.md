# Database Backup & Restore Guide

## Database Type

- **Database**: PostgreSQL 16 (Alpine)
- **Container**: `arbigrow-postgres`
- **Database Name**: `arbigrow`
- **User**: `postgres`
- **Port**: 5432 (internal, not exposed externally)

## Automated Backups

The server has daily automated database backups at 03:00 UTC stored in `/root/backups/` as compressed dump files:

```
/root/backups/arbigrow-db-YYYY-MM-DD_03-00.dump.gz
```

## Manual Backup

### Export (Create a dump)

```bash
# Via Docker container (recommended)
docker exec arbigrow-postgres pg_dump -U postgres -d arbigrow --format=custom --compress=9 -f /tmp/arbigrow-backup.dump
docker cp arbigrow-postgres:/tmp/arbigrow-backup.dump ./arbigrow-backup.dump
docker exec arbigrow-postgres rm /tmp/arbigrow-backup.dump

# Compress further (optional)
gzip arbigrow-backup.dump
```

### Export as SQL (more portable but larger)

```bash
docker exec arbigrow-postgres pg_dump -U postgres -d arbigrow --clean --if-exists > arbigrow-backup.sql
gzip arbigrow-backup.sql
```

## Restore

### Prerequisites

1. A running PostgreSQL instance (version 16 recommended)
2. An empty database named `arbigrow` or the restore will overwrite existing data
3. The dump file available on the server/container

### Restore from custom format dump (.dump or .dump.gz)

```bash
# Copy dump to container
docker cp ./arbigrow-backup.dump arbigrow-postgres:/tmp/arbigrow-backup.dump

# Restore
docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow --clean --if-exists /tmp/arbigrow-backup.dump

# Clean up
docker exec arbigrow-postgres rm /tmp/arbigrow-backup.dump
```

### Restore from compressed dump (.dump.gz)

```bash
# Decompress and restore in one step
gunzip -c arbigrow-backup.dump.gz | docker exec -i arbigrow-postgres pg_restore -U postgres -d arbigrow --clean --if-exists

# Or decompress first
gunzip arbigrow-backup.dump.gz
docker cp ./arbigrow-backup.dump arbigrow-postgres:/tmp/arbigrow-backup.dump
docker exec arbigrow-postgres pg_restore -U postgres -d arbigrow --clean --if-exists /tmp/arbigrow-backup.dump
```

### Restore from SQL dump

```bash
gunzip -c arbigrow-backup.sql.gz | docker exec -i arbigrow-postgres psql -U postgres -d arbigrow
```

### Restore to a fresh VPS (without Docker)

```bash
# Install PostgreSQL 16
sudo apt update && sudo apt install -y postgresql-16

# Create database and user
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE arbigrow OWNER postgres;"

# Restore
gunzip -c arbigrow-backup.dump.gz | pg_restore -U postgres -d arbigrow --clean --if-exists
```

## Migration (Alembic)

The application uses Alembic for schema migrations. After restoring a database, run:

```bash
# From inside the backend container
docker exec arbigrow-backend alembic upgrade heads

# Or during initial deployment via the migrate container
docker compose up migrate
```

## Notes

- The dump format (`--format=custom`) preserves schema, data, indexes, and is compressed.
- Always back up the `.env` file alongside the database — it contains secrets not stored in the DB.
- The backup directory `/root/backups/` has daily automated dumps — use the most recent one for recovery.
- Database size is approximately 16 GB (as of 2026-07-27).
