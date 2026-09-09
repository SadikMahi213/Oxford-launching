# Database

Engine: **SQLite 3.45 (WAL, synchronous=NORMAL, foreign_keys=ON, busy_timeout=30s)**.
Rationale in ARCHITECTURE.md. Full DDL: `app/infra/schema.sql` (~30 tables:
users/roles/permissions, businesses/terminals/settings/taxes/invoice_sequences,
products/categories/brands/units/barcodes, suppliers/payments, customers/payments,
purchases/items/returns, inventory_batches/movements/adjustments,
sales/items/payments/returns/held, expenses, cash_sessions/movements, loyalty,
audit_logs (immutable triggers), licenses/devices, backups/system_logs).

Key design points:
- Money = NUMERIC(12,2) via Decimal strings; quantities NUMERIC(18,3).
- Inventory is a **ledger**: `inventory_batches` holds per-batch qty;
  `inventory_movements` appends one row per change with source (sale/purchase/
  return/cancel/adjustment). Stock is never blindly overwritten.
- Sales consume batches FEFO (expiry ASC, nulls last). `allow_negative_stock`
  is a config flag, default OFF.
- `invoice_sequences(prefix, year)` + `next_invoice_no()` inside the sale
  transaction => unique `INV-YYYY-000001` numbers, thread-tested.
- Immutability triggers: `audit_logs` reject UPDATE/DELETE; `sale_items`
  reject UPDATE. Cancellations/returns are reversal rows, never deletes.
- Invariants enforced in services + tests: totals reconcile, due=total-paid,
  credit limits, paid<=total on purchases, customer required for due.
- LAN warning: do NOT put this file on a Windows share. Multi-terminal ships
  next via a store-server backend behind the `infra/db.py` seam.
