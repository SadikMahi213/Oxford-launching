# Database (Release 2)

Engine: SQLite + WAL + `busy_timeout=30s` + FK, single writer per file (one process
in LAN mode). v1 DDL frozen; v2 delta in `migrate_v1_v2.py` (see MIGRATIONS.md).

Ledger core (unchanged): `inventory_batches` (per-batch qty/cost/expiry) +
`inventory_movements` (every change, source_type/source_id). Invariant
(opening + purchases + returns + in − sales − purchase_returns − waste − out ±
adjustments = stock) verified by `reconcile.check_stock` (movements Σ == batches Σ).

Financial truth: sales (+items/+payments, immutable triggers), purchases,
sale/purchase returns (reversal rows, never deletes), customer/supplier balances
recomputed event-wise by `reconcile` (negative = advance credit, no clamping).
`sale_items.unit_cost` preserves historical COGS (margins stay truthful).
`invoice_sequences` serves sales + purchase orders atomically; idempotency keys
(sales/purchases, UNIQUE) make retries safe.

Identity/context: branches, terminals (branch/register/token hash/last_seen),
shifts (open→active→closing→closed + partial-unique open guard), invoice prefix/year
sequences. Governance: dotted permissions + roles, approvals, audit_logs (triggers +
hash checkpoints), print_jobs, outbox, licenses/devices, backups.

Concurrency: BEGIN IMMEDIATE writer serialization; tested 5-thread + 2-terminal
limited-stock races. Never place this file on a network share.
