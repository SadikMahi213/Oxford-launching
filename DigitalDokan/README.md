# DigitalDokan — Offline-First Grocery/Super Shop POS (Bangladesh)

Commercial, enterprise-grade Windows desktop POS. Native Qt (PySide6) UI, local
SQLite database (WAL), fully functional without internet. Release 2 adds LAN
multi-terminal (store server), promotions, unit conversions, approvals, license
states/editions, and a 90-test verification suite.

> Canonical R2 documentation lives in `docs/` (ARCHITECTURE, DATABASE,
> MIGRATIONS, SECURITY, BACKUP_RECOVERY, HARDWARE, LICENSE, LAN, INSTALLATION,
> USER_GUIDE, ADMIN_GUIDE, CHANGELOG, RELEASE_CHECKLIST, RELEASE_2_FINAL_AUDIT).
> Root-level R1 docs remain as the Release-1 record.

Release 1 scope (all working, no placeholders): offline POS, products/barcodes,
inventory ledger + batch/expiry (FEFO), purchases, customer/supplier due, sales
returns + cancellations (reversal workflows), thermal + A4 printing, cash drawer,
shift open/close with reconciliation, expenses, basic + profit reports, roles &
permissions, immutable audit logs, backup/restore with integrity checks,
Bangla/English UI, BDT money with Decimal arithmetic, offline licensing
(trial/single-store, grace period).

## Quick start (dev)

```bat
pip install -r requirements.txt
python -m app.main            :: launch desktop app
python -m unittest discover -s tests -v
python tools\check_health.py
```

First run creates `%APPDATA%\DigitalDokan\digitaldokan.db` and a default
`admin / Admin@123` owner — change the password immediately (Users tab).

## Layout

```
app/domain/     money.py, pricing.py, invoices.py   (no I/O, unit-tested)
app/infra/      db.py, schema.sql, migrations.py, security.py, backup.py, license_manager.py
app/services/   auth, product, pos (CompleteSale atomic), purchase, party, shift, report, settings, import_export, audit
app/hardware/   devices.py (IPrinter/IScanner/IScale + Win32 ESC/POS + Null fallback)
app/printing/   receipt.py (80/58mm text builder)
app/i18n/       en.json, bn.json
app/ui/         login, POS (F3/F7/F9), products, purchases, customers, suppliers, shifts, reports, users, settings, backup
tests/          test_money.py, test_integration.py (12 tests, all passing)
installer/      inno_setup.iss   tools/build_installer.ps1
```

## Docs

ARCHITECTURE, DATABASE, SECURITY, BACKUP_RECOVERY, HARDWARE_INTEGRATION,
LICENSE_SYSTEM, INSTALLATION, DEPLOYMENT, TESTING, CHANGELOG, USER_MANUAL,
ADMIN_MANUAL — all match this implementation.
