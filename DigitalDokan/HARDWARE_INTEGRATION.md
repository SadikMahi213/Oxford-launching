# Hardware Integration

Seam: `app/hardware/devices.py` (`IPrinter`, `IScanner`, `IScale`).

- **Barcode scanner**: keyboard-wedge USB HID — works with zero code; POS search
  box has focus shortcut F3, Enter adds to cart. Any HID scanner works.
- **Thermal printer**: `Win32RawPrinter` sends UTF-8 + ESC/POS cut (`1DV00`) via
  win32print RAW spool. 80mm (42 cols) / 58mm (32 cols) via receipt builder width.
  If the printer/driver is missing, receipt is saved to a file and the UI shows
  "Printer unavailable. Sale completed successfully. You can reprint later." —
  the sale is NEVER rolled back for print failure.
- **A4 invoice**: use any Windows printer from the Reports/export flow
  (print the exported CSV/PDF); Qt print dialog path is the documented option.
- **Cash drawer**: printer-triggered (`1Bp0019FA`); enable in Settings
  (`cash_drawer_enabled=1`) once the drawer is cabled through the printer.
- **Weighing scale**: `IScale` interface ships; USB/RS232 vendor protocols vary
  per model, so Release 1 supports manual weight entry (qty field accepts
  decimals e.g. 0.532 kg) and documents the integration point for scale vendors.
- **Label printer**: product barcode column + export provides the data source;
  ESC/POS label templates are a post-R1 driver task (interface ready).
- **Customer display**: optional, deferred (documented; no fake menu item).
