# Architecture Audit — DigitalDokan R1 → R2

Date: 2026-09-09. Auditor: lead architect (automated inspection + test evidence).
Baseline: 12/12 unittest pass (`python -m unittest discover -s tests`, 3.7s).
Runtime: Python 3.13.5, PySide6 NOT installed in this environment (UI paths verified by code read only).

## 1. Map (as built)

- UI (`app/ui/`): `app_context` (single shared `sqlite3.Connection`, session, terminal, shift cache) →
  `login_dialog` → `main_window` (tab shell, role-gated tabs, fake auto-lock) →
  `pos_widget` (cart/checkout/return/cancel/reprint/hold), `products_widget` (CRUD + CSV import),
  `ops_widgets` (Purchases free-text DSL, Parties collect/pay, Ops shifts/expenses),
  `admin_widgets` (Reports, Settings+business+license, Users, Backup).
- Domain (`app/domain/`): `money` (Decimal, 2dp, HALF_UP — sound), `pricing` (CartLine + compute_totals — sound),
  `invoices` (per-prefix/year sequence — correct inside txn).
- Services (`app/services/`): `auth` (PBKDF2 260k, lockout 5×15min, Session.require — sound),
  `pos` (atomic sale/return/cancel/hold — sound core), `purchase`, `party` (incl. adjust_stock),
  `shift`, `report`, `settings`, `import_export`, `audit` (append-only + triggers — sound).
- Infra (`app/infra/`): `db` (WAL, busy_timeout 30s, FK ON — sound), `schema.sql` v1 (~30 tables),
  `migrations` (create+seed only, NO version-gated upgrade path), `security`, `backup`
  (VACUUM INTO + sha256 manifest + retention + quarantine restore — sound), `license_manager`
  (HMAC DDK1, device bind, 7-day grace — sound), `device_fingerprint`, `logging_setup`.
- Hardware (`app/hardware/devices.py`): IPrinter/IScanner/IScale; NullPrinter + Win32RawPrinter real;
  scanner/scale/display/label have NO implementation. Printing: `printing/receipt.py` 42-col text only.
- Entry/config: `main.py` (first-run detect, login, window), `config.py` (%APPDATA% flat layout),
  `backup_cli.py`, `tools/check_health.py`, `tools/build_installer.ps1`, `installer/inno_setup.iss`.

## 2. Extension seams (usable for R2)

1. `infra/db.py::connect()` — single factory; backend swap point (server mode keeps sqlite file per node).
2. Service functions all take `(conn, *, session, ...)` — a LAN server can reuse them verbatim in request handlers.
3. `hardware/devices.py` ABCs + `get_printer()` factory — add classes without touching callers.
4. `Session.require/can` — central choke point; alias map can bridge R1→dotted permission codes.
5. `invoice_sequences` + `next_invoice_no()` — extend to per-register sequences.
6. `inventory_movements(source_type, source_id)` — new sources (transfer, purchase_return, sync) fit.
7. `settings` kv + `businesses` row — thresholds/flags prompt: no new plumbing needed for approvals/promos/LAN policy.
8. `audit.record()` — single choke point; add hash-chain column compatibly.
9. `backups` table + manifest JSON — version/compat fields are additive.
10. License payload is JSON+HMAC — editions/flags/states are additive fields.

## 3. Technical debt (ranked)

1. No migration framework: `initialize()` runs full v1 DDL + seed every launch; no version gate, no backup-before-migrate, no downgrade guard (migrations.py:69-78).
2. Business logic in UI: cart math, DSL parsing (`SKU=qty@cost`, `pid=qty`), direct SQL in 3 widgets, print policy in POS.
3. UI-displayed cart total ignores discounts (pos_widget:139-145,239) — overcharge bug.
4. Float money in Qt dialogs (QDoubleSpinBox→float→service) in POS + products.
5. Single shared sqlite connection in UI thread; tests share it across threads (works only via BEGIN IMMEDIATE + GIL luck).
6. i18n dead: `t()` never called; ~100 hardcoded strings; bn.json covers 19 keys.
7. No repository/UoW layer; every service hand-rolls `BEGIN IMMEDIATE/commit/rollback`.
8. Reports run on UI thread; no pagination (LIMIT 100/200 hard caps hide data silently).
9. `sales.status` includes 'held' but hold uses separate `held_sales` table — dead state.
10. `stock_transfers` header-only (no items/service); `purchase_returns` write-path missing (no service).

## 4. Security vulnerabilities

1. **UI-only authorization** (HIGH): product upsert/import, purchase receive, supplier/customer money, shift ops, settings, user create, backup/restore, all reports enforce nothing in services. Direct service call bypasses tab-hiding.
2. **Default credential notice** (HIGH): `admin/Admin@123` printed in login dialog; no forced rotation flag.
3. **Auto-lock is fake** (MED): closes window; session object/DB handle lifetime not expired; relaunch reuses nothing but no re-auth of in-memory state matters only for future LAN tokens — fix with real expiry + token TTL.
4. **Printer fallback writes CWD** (MED): receipt PII lands in install dir; fails under Program Files.
5. **`_selected_id` row-0 fallback** (HIGH integrity): collect/pay can hit wrong party.
6. PIN verify does extra PBKDF2 with attacker-controlled input before compare — timing/doS negligible but code path convoluted; keep, simplify later.
7. No audit hash-chain: triggers stop DELETE/UPDATE via SQL, but a file-level attacker can rewrite the .db undetected (backup manifest only covers backups). Mitigate: periodic signed audit checkpoint (R2).

## 5. Concurrency risks

1. `receive_purchase` invoice no. uses `MAX(id)+1` OUTSIDE unique protection — two concurrent transactions can compute same `PO-YYYY-NNNNNN`; second INSERT fails UNIQUE → user-visible error + retry (safe but noisy; fix with sequence table like sales).
2. FEFO consume is read-modify-write inside BEGIN IMMEDIATE — safe on single SQLite file (writer lock serializes), UNSAFE if file ever shared over SMB (locking unreliable) — hence LAN server, never shared file.
3. `open_shift` check-then-insert race → duplicate open shifts (add partial unique index `(user_id) WHERE status='open'`... per terminal in R2).
4. `next_invoice_no` read-modify-write is inside the sale txn under IMMEDIATE — safe locally; LAN server must keep single-writer service boundary.
5. No idempotency keys: double-click/ retry-after-timeout creates duplicate sales (add `idempotency_key UNIQUE`).

## 6. Data-integrity risks

1. `close_shift` cash expenses query is GLOBAL (`expenses WHERE method='cash'`, shift_service:62) — every shift close subtracts ALL historical cash expenses. Wrong after day 1. Must scope to shift (needs `shift_id` on expenses — schema change).
2. `process_return`/`cancel_invoice` restock to `batch_no=''` default batch, ignoring original batch/expiry — FEFO/cost traceability breaks on returns.
3. `collect_due`/`pay_supplier` clamp balance at 0 (`CASE WHEN balance-? <0 THEN 0`) — overpayments silently vanish instead of recording credit/returning change.
4. Purchase `line_total = cost*qty` unrounded float-adjacent (Decimal*Decimal unquantized) stored as string — rounding dust vs sale-side quantized math.
5. `product_sales.profit_est` uses CURRENT cost_price against historical sales — margin fiction after cost changes (needs historical unit_cost on sale_items).
6. Held-sale payload is unvalidated JSON; resume trusts product ids/prices (re-validate on resume).
7. `search("")` returns everything (LIKE '%%') capped at 200 — silent data hiding in UI.

## 7. Performance bottlenecks

1. `lookup_barcode` + `search` do per-row correlated `SUM(qty)` subqueries — fine at 10k (0.2/3.8ms measured) but degrades linearly; add covering index / stock cache column at 100k+.
2. `stock_report` full join+group over batches; no pagination.
3. Reports do N+1-ish aggregation in Python (`profit_summary` 3 round trips + Decimal(str()) per row) — acceptable; move to single SQL at 500k sales.
4. `VACUUM INTO` backup blocks writers for DB-size duration; fine <1GB; document window.

## 8. Missing automated tests (R2 must add)

Promotions; crash-mid-txn recovery; RBAC bypass (all UI-only services); idempotent retry; ledger invariants (sale=items=payments, movements=stock, due/payable, shift cash); purchase returns; transfers; approval thresholds; license states; LAN 2-terminal + limited-stock race; backup version/compat + failed-restore rollback; perf at 50k/100k products + large sales volume.

## 9. Decisions for R2 (locked)

- Keep Python/PySide6/SQLite-WAL single-PC core. No rewrite.
- LAN = stdlib-HTTP Store Server reusing the SAME service functions; SQLite file touched by ONE process only.
- Dotted permission codes ADDED with R1 alias map; R1 DBs keep working.
- Migration v1→v2: transactional DDL, backup-first, validation; `__db_version__=2`.
- Money stays Decimal; quantities Decimal; UI money input becomes paisa-integer widget.
- No NBR/Mushak compliance claims; tax engine stays configurable.
- Cloud: outbox + engine + pluggable transport only; no vendor endpoint (honestly documented).
