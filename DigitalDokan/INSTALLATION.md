# Installation (clean Windows machine)

1. Run `DigitalDokan-Setup-1.0.0.exe` (built by `tools/build_installer.ps1` + Inno).
   It installs the app, creates `%APPDATA%\DigitalDokan` (DB, backups, logs),
   Desktop + Start Menu shortcuts.
2. Launch DigitalDokan. First run: login `admin` / `Admin@123`, then immediately
   change the password (Users tab -> recreate/disable default).
3. Settings tab: store name/address/phone/BIN, printer name, receipt size (80/58mm),
   language (en/bn). Activate license key.
4. Products tab: add products or Import CSV (`sku,name,sell_price,cost_price,barcode,...`).
5. Receive opening stock via Purchases tab (`SKU=qty@cost` lines).
6. Open a shift (Shifts/Expenses tab), sell from POS (F3 search, F9 charge),
   close shift and reconcile.
7. Backup tab -> "Backup now"; copy `%APPDATA%\DigitalDokan\backups` off-machine.

Uninstall preserves `%APPDATA%\DigitalDokan` (database + backups) by design.
Python dev alternative: `pip install -r requirements.txt` then `python -m app.main`.
