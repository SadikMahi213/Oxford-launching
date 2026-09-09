# Backup & Recovery

- Auto model: call `backup.create_backup()` on schedule (daily default; wire to
  Windows Task Scheduler pointing at `python -m app.backup_cli` or add a QTimer —
  manual one-click backup ships in UI Backup tab; retention keeps newest 14).
- Manual: Backup tab -> "Backup now" (permission `backup`).
- Mechanism: `PRAGMA integrity_check` first (refuse on corruption), then
  `VACUUM INTO` snapshot (safe while POS runs), sha256 manifest
  `<name>.manifest.json`, row in `backups` table.
- Verify: recompute sha256 + compare manifest + `integrity_check` on the copy.
- Restore (permission `restore`): verify first, quarantine live DB to
  `digitaldokan.db.pre-restore-<ts>.bak`, copy backup in, restart app.
- Destinations: local `%APPDATA%\DigitalDokan\backups` default; copy the folder
  to external/network drive for off-machine safety (documented in USER_MANUAL).
- Crash/power: every financial op is one `BEGIN IMMEDIATE ... COMMIT` transaction
  on WAL; power loss between ops leaves either full commit or full rollback —
  tested by `test_half_write_impossible`.
- DR procedure: 1) keep last 14 backups, 2) copy one off-machine daily,
  3) to recover: install app, restore newest verified backup, run
  `check_health.py`, resume sales.
