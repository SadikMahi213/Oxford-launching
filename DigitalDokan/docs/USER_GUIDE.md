# User Guide (Release 2)

Daily: login → Shifts/Expenses → Open shift (opening cash) → POS: F3 focus, scan
or type, Enter adds; favorites panel click-adds; double-click a line to edit
qty/price/discount, Del removes. Charge (F9): promotion (or Auto-best), invoice
discount, Add tenders (split across cash/card/bKash/Nagad/Rocket/Upay/bank/due),
Charge. Due needs customer phone/ID in the customer box (created in Customers).
Hold (F7) parks; Held bills resumes. Returns/cancels/reprints: invoice number +
button (manager-gated, big ones need approval — an approver logs in once).

Tabs: Products (add/edit/import, favorites star via edit), Purchases, Customers
(collect due), Suppliers (pay), Shifts/Expenses (cash in/out, expenses attach to
the open shift, close + count + over/short), Reports (day/week/month/hour,
cashier/register/branch/payment, products/margin, stock, profit, expiry; CSV/XLSX/
PDF export), Users (owner/manager), Settings (store, printer, language, license,
LAN), Backup (now/verify/restore-then-restart), Help → Diagnostics.

Offline: everything local works without internet. LAN mode: if the server is down
you get one clear message and nothing is recorded anywhere — never re-enter the
same bill twice without checking Held/invoice lookup (idempotency protects
retries with the same key).
