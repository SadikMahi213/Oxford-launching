# Installation (Release 2)

Clean machine: run `DigitalDokan-Setup-2.0.0.exe` (built by `tools/build_installer.ps1`,
which refuses to build on red tests). Installs program files + server bundle;
creates `%PROGRAMDATA%\DigitalDokan\data\{backups,logs,licenses}` (machine layout)
— per-user default stays `%APPDATA%\DigitalDokan`. Shortcuts: desktop + Start Menu
(app + Store Server). Uninstall preserves all data dirs.

First run: login `admin / Admin@123` → forced rotation → Settings (store profile,
BIN/TIN, VAT mode, printer, 80/58mm, language, license activation) → Products
(add/import CSV) → Purchases (`SKU=qty@cost`, carton units supported) → open shift
→ sell (F3/F9/F7) → close + reconcile → Backup now + off-machine copy.

Upgrade 1.0→2.0: verify license → backup → `check_health.py` (integrity ok) →
install over previous version (data untouched) → auto-migrate v1→v2 with
pre-migration safety copy + validation → `check_health.py` again. Rollback:
reinstall 1.0 + restore newest verified backup (schema-gated).

LAN store: install on the host PC, run `DigitalDokan-Server.exe --db <path>
--host 0.0.0.0 --port 8765` (open the port in Windows Firewall), register
terminals, point counters at it in Settings → LAN. Data dir override:
`DIGITALDOKAN_DATA_DIR`; machine layout: `DIGITALDOKAN_MACHINE=1`.
