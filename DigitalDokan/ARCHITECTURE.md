# Architecture

Layered, offline-first native desktop:

```
Qt Widgets UI (app/ui) -> Services (app/services, transactions+RBAC)
  -> Domain (app/domain, pure pricing/money/invoice rules)
  -> Infra (app/infra, SQLite WAL, backup, licensing, security)
  -> SQLite file / Win32 printing / backup dir
```

1. **Architecture**: strict separation; no SQL in UI event handlers (UI calls
   services only); hardware behind `IPrinter/IScanner/IScale`; database behind
   `infra/db.py` connection factory so a LAN server backend can replace SQLite.
2. **Modules**: auth, catalog, POS, inventory ledger, purchase, parties/due,
   shifts/expenses, reports, settings, backup, licensing, audit, i18n, printing.
3. **Database**: SQLite + WAL + `busy_timeout=30s` + FK enforcement. Chosen over
   Firebird/PostgreSQL-local for Release 1 because: zero-service install,
   VACUUM INTO online backup, proven crash recovery (WAL), trivial installer.
   LAN multi-terminal is **designed for, not yet shipped**: never share the .db
   over SMB; the supported path is a single store server process + TCP. `db.py`
   is the seam. See DATABASE.md.
4. **Security**: PBKDF2-HMAC-SHA256 (260k iters), lockout after 5 failures,
   RBAC enforced in services (`session.require(...)`), immutable audit triggers.
5. **Hardware**: keyboard-wedge scanners (no driver), Win32 raw ESC/POS with
   graceful file-fallback; print failure never rolls back a sale.
6. **Backup/recovery**: `VACUUM INTO` + sha256 manifest + retention + verify +
   quarantine-restore. All financial writes are single transactions
   (`BEGIN IMMEDIATE`), so power loss commits or rolls back atomically.
7. **Licensing**: `DDK1.<payload>.<hmac-sha256>` keys, device binding via stable
   fingerprint (hostname+MAC+MachineGuid hash), 30-day trial, 7-day grace where
   POS keeps working and admin is warned.
8. **Testing**: unittest suite (money invariants, atomic sale/return/cancel,
   due limits, RBAC, invoice uniqueness under threads, backup integrity,
   lockout). Perf smoke: 10k products, 0.2ms barcode lookup, 3.8ms search.
9. **Packaging**: PyInstaller one-dir + Inno Setup (`installer/inno_setup.iss`);
   `%APPDATA%\DigitalDokan` data dir preserved on uninstall.
10. **Migration**: `schema.sql` + `schema_version` table; `migrations.seed_system`
    is idempotent, safe to re-run on update after a pre-update backup.
