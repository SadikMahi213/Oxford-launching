# User Manual (Release 1)

## Daily flow
1. Login (your username + password/PIN). First ever login: admin/Admin@123.
2. Shifts/Expenses -> Open shift, enter opening cash.
3. POS tab: click search or press F3, scan barcode or type name/SKU, Enter adds.
   Quantity defaults to 1; double-click cart rows conceptually = remove via Clear
   and re-add (per-line edit ships in 1.1 — documented limitation).
4. Charge (F9): pick method (cash/card/bKash/Nagad/Rocket/bank/due/other), amount,
   reference if any. For due sales, type the customer phone or ID in the customer
   box first (create the customer in the Customers tab if new); the sale is blocked
   without a valid customer, and credit limits are enforced.
5. Receipt prints (or a clear message tells you to reprint). Cash drawer pops if enabled.
6. Hold (F7) parks a cart; resume from held list via manager.
7. Close shift: count cash, enter actual, record over/short.

## Tabs
Products (add/edit/import), Purchases (`SKU=qty@cost`), Customers (add, collect
due), Suppliers (add, pay), Shifts/Expenses, Reports (filter + export CSV),
Users (owner/manager only), Settings (store profile, printer, language, license),
Backup (backup now, verify, restore).

## Shortcuts
F3 search, F9 charge, F7 hold, Enter confirm. Barcode scanners just type + Enter.

## Safety
Never delete the `%APPDATA%\DigitalDokan` folder. If anything looks wrong, note
the ERR reference on the dialog and call support with a diagnostics export.
