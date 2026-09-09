# Admin Manual

## Roles & permissions
Owner/Super Admin (all), Manager (sell/refund/cancel/discount/price/stock/reports/
backup/approve), Cashier (sell only), Inventory Manager (stock+products), Accountant
(reports+profit), Supervisor (sell/refund/discount/approve). Enforced in services.

## Money & VAT
All money is Decimal(12,2). VAT per product + business default; `vat_inclusive=1`
means shelf price already includes VAT (no add-on). VAT rate is editable; no
hard-coded NBR rates. Mushak/BIN: store BIN prints on receipts; full NBR e-filing
is out of scope for R1 (no compliance claim made).

## Discounts
Item/invoice discounts need `give_discount`; price overrides need `change_price`.
Every discount is stored on the sale row and in audit.

## Inventory truth
Stock = sum(batches). Every change has a movement row. Adjustments need reason +
manager approval. Negative stock is OFF by default (`allow_negative_stock`).

## Fraud controls
Audit tab data via Reports; cancelled invoices stay in DB with reason + canceller;
returns are new reversal rows; cashiers cannot delete anything (no delete UI exists
for financial records; DB triggers block tampering).

## Backup/licensing/support
Backup tab daily + off-machine copy. License via Settings activation; 7-day grace
after expiry. Support bundle: version, `check_health.py` output, latest log lines
from `%APPDATA%\DigitalDokan\logs` — no customer PII needed.
