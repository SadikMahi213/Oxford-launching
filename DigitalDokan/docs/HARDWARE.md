# Hardware (Release 2)

Seam: `app/hardware/` — `devices` (printers), `scanner`, `scale`, `peripherals`
(display/label), `a4`. Every device has a simulator; admin checks run them from
Help → Diagnostics (`print_service.hardware_self_test`).

- Scanner: HID wedges need no driver (keystrokes into F3 search); `clean_scan`
  strips suffixes; simulator for tests.
- Thermal: Win32 RAW ESC/POS + cut, 80mm/42col + 58mm/32col from settings, drawer
  pulse when enabled, file fallback into logs dir. Failures return a message —
  sales never roll back; reprint any time.
- A4: HTML invoice model → Qt print/preview dialog on any Windows printer.
- Scale: `ScaleProtocol` + `GenericSerialScale` (port/baud/regex/unit/divisor) +
  `RegexAdapterScale` vendor profiles (`VENDOR_PROFILES`, extendable) + simulator.
  pyserial optional with a clear error. POS qty accepts decimals (e.g. 0.532 kg).
- Display: serial 2-line pole (never raises) + simulator. Label: ESC/POS template
  through any `IPrinter` + simulator.
- Central `print_service`: receipt/A4 builders (BIN/TIN/cashier/register/payments/
  discounts/promo/VAT/due, Bangla footer key), `print_jobs` ledger (queued/ok/failed),
  reprint audit. Nothing in the UI talks to drivers directly anymore.

Not verified here: physical printer/driver matrix, real scale wiring (needs hardware).
