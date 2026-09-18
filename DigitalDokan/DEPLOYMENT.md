# Deployment & Updates

- Build: `powershell -ExecutionPolicy Bypass -File tools/build_installer.ps1`
  (PyInstaller one-dir -> Inno Setup exe, version stamped 1.0.0).
- Pre-update on a customer machine: verify license, run `check_health.py`
  (integrity must be `ok`), take a manual backup.
- Update: run new installer (overwrites program files only; `%APPDATA%`
  data untouched), `migrations.seed_system` re-runs idempotently, launch and
  re-run `check_health.py`.
- Rollback: quarantine new install, restore newest verified `.db` backup,
  reinstall previous exe. User data is never deleted by the installer.
- Multi-terminal/branches: not in Release 1 installer; architecture seam
  (`infra/db.py`) reserved for the store-server backend.
