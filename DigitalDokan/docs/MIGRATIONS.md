# Migrations (§35)

Framework: `app/infra/migrations.py` — `MIGRATIONS = {2: migrate_1_to_2, ...}`,
`get_db_version()`, `migrate_db(db_path, backup_first=True)`, `initialize()`.

Rules: v1 DDL frozen (`schema.sql` untouched; `schema_v1.sql` is the test snapshot).
All deltas additive + rerunnable (IF NOT EXISTS / duplicate-column tolerance).
Each version runs inside one transaction; failure → ROLLBACK + restore of the
WAL-checkpointed pre-migration copy + re-verify (tested).

`migrate_db` flow: version check → downgrade refusal → integrity gate → safety copy
(`.pre-migrate-<ts>.bak`) → apply pending → `seed_system` (new perms/roles/settings)
→ `_validate` (integrity + tables + invoice uniqueness) → report dict.

v1→v2 contents (`migrate_v1_v2.py`): branches + terminal branch/register columns,
sales branch/register/idempotency/promotion/exchange columns, purchases idempotency,
purchase_return_items, stock_transfer_items, expenses.shift_id, sale_items.unit_cost
(backfilled; trigger dropped/recreated around backfill), users.must_change_password,
products is_favorite/purchase_unit_id/sell_unit_id, unit_conversions, customer_groups
+ group_id, promotions, approvals, print_jobs, outbox, audit_checkpoints, terminal
auth columns, cash_sessions lifecycle rebuild + open-shift partial unique index,
line unit columns, scale indexes. Seed: dotted permissions, Auditor/Branch Manager
roles, MAIN branch, VIP/Regular groups, approval thresholds.

Adding v3: new `migrate_v2_v3.py` + registry entry + bump `__db_version__` + tests
(fresh init + synthetic v2 upgrade + failure rollback). Never edit old deltas.
