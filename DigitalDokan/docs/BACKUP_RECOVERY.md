# Backup & Recovery (Release 2)

Scheduled (`backup_cli.py` via Task Scheduler) + one-click UI backup. Mechanism:
integrity gate → history row (in-progress) → `VACUUM INTO` online snapshot →
sha256 manifest (+db_version) → finalize row → retention prune (files + rows +
orphan sweep). Manifest + schema version recorded; verify recomputes hash,
integrity, and app-compatibility (newer-schema backups refused with an update
message, never silently applied).

Restore (permission-gated): pre-validation → quiesce check (refuse on active
writer) → timestamped quarantine copy → replace → post-verify → finalize history
row. Post-verify failure → automatic rollback from quarantine (tested with forced
corruption). Windows file locks mean restore runs as close→restore→restart
(the UI does exactly this and quits into relaunch).

Health: directory-driven indicator (fresh/stale/missing/unverified/none) shown in
Backup tab + Diagnostics. Crash safety: every financial op is one IMMEDIATE
transaction on WAL — kill-mid-sale tested with a real dying subprocess (no partial
rows, lock released, backup validates after). DR: keep 14, copy one off-machine
daily, recover via installer + newest verified backup + `check_health.py`.
