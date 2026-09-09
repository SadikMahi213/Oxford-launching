"""v1 → v2 schema delta. Additive and idempotent; runs inside migrate_db's transaction.

Covers: branches/registers, idempotency keys, purchase-return items, transfer items,
shift-scoped expenses, historical unit_cost, forced password rotation, exchange links,
favorites, unit conversions, customer groups, promotions, approvals, print jobs,
outbox (sync), audit checkpoints, terminal registration, shift lifecycle states.
"""
from __future__ import annotations

import sqlite3

V2_DDL = [
    # --- organizations / branches (§6) ---
    """CREATE TABLE IF NOT EXISTS branches (
         id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
         address TEXT DEFAULT '', phone TEXT DEFAULT '', is_active INTEGER NOT NULL DEFAULT 1,
         created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))""",
    "INSERT OR IGNORE INTO branches(code, name) VALUES('MAIN','Main Branch')",
    "ALTER TABLE terminals ADD COLUMN branch_id INTEGER REFERENCES branches(id)",
    "ALTER TABLE terminals ADD COLUMN register_no TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE terminals ADD COLUMN auth_token_hash TEXT",
    "ALTER TABLE terminals ADD COLUMN last_seen TEXT",
    "ALTER TABLE sales ADD COLUMN branch_id INTEGER REFERENCES branches(id)",
    "ALTER TABLE sales ADD COLUMN register_no TEXT NOT NULL DEFAULT ''",
    # --- idempotency (§9, §25) ---
    "ALTER TABLE sales ADD COLUMN idempotency_key TEXT",
    "ALTER TABLE purchases ADD COLUMN idempotency_key TEXT",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_idempotency ON sales(idempotency_key)",
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_purchases_idempotency ON purchases(idempotency_key)",
    # --- purchase returns line items (§12) ---
    """CREATE TABLE IF NOT EXISTS purchase_return_items (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
         product_id INTEGER NOT NULL REFERENCES products(id),
         qty NUMERIC(18,3) NOT NULL CHECK (qty > 0),
         cost NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
         line_total NUMERIC(12,2) NOT NULL)""",
    # --- stock transfer line items (§7) ---
    """CREATE TABLE IF NOT EXISTS stock_transfer_items (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         transfer_id INTEGER NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
         product_id INTEGER NOT NULL REFERENCES products(id),
         from_batch_id INTEGER REFERENCES inventory_batches(id),
         to_batch_no TEXT NOT NULL DEFAULT '',
         qty NUMERIC(18,3) NOT NULL CHECK (qty > 0))""",
    # --- shift-scoped expenses (fixes global-expense shift bug) ---
    "ALTER TABLE expenses ADD COLUMN shift_id INTEGER REFERENCES cash_sessions(id)",
    "CREATE INDEX IF NOT EXISTS idx_expenses_shift ON expenses(shift_id)",
    # --- historical COGS (fixes margin-fiction report bug) ---
    "ALTER TABLE sale_items ADD COLUMN unit_cost NUMERIC(12,2)",
    # --- forced password rotation ---
    "ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0",
    # --- exchange links (§9) ---
    "ALTER TABLE sales ADD COLUMN exchange_of_sale_id INTEGER REFERENCES sales(id)",
    "ALTER TABLE sale_returns ADD COLUMN exchange_sale_id INTEGER REFERENCES sales(id)",
    # --- POS favorites (§9) ---
    "ALTER TABLE products ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE products ADD COLUMN purchase_unit_id INTEGER REFERENCES product_units(id)",
    "ALTER TABLE products ADD COLUMN sell_unit_id INTEGER REFERENCES product_units(id)",
    # --- unit conversions (§8) ---
    """CREATE TABLE IF NOT EXISTS unit_conversions (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         from_unit_id INTEGER NOT NULL REFERENCES product_units(id),
         to_unit_id INTEGER NOT NULL REFERENCES product_units(id),
         factor NUMERIC(18,6) NOT NULL CHECK (factor > 0),
         UNIQUE (from_unit_id, to_unit_id))""",
    # --- customer groups (§11) ---
    """CREATE TABLE IF NOT EXISTS customer_groups (
         id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
         discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100))""",
    "INSERT OR IGNORE INTO customer_groups(name, discount_pct) VALUES('Regular', 0)",
    "INSERT OR IGNORE INTO customer_groups(name, discount_pct) VALUES('VIP', 5)",
    "ALTER TABLE customers ADD COLUMN group_id INTEGER REFERENCES customer_groups(id)",
    # --- promotions, R2 subset: percent/fixed/category/customer-group (§20) ---
    """CREATE TABLE IF NOT EXISTS promotions (
         id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
         kind TEXT NOT NULL CHECK (kind IN ('percent','fixed','category_percent','group_percent')),
         scope TEXT NOT NULL DEFAULT 'invoice' CHECK (scope IN ('invoice','line','category','group')),
         target TEXT NOT NULL DEFAULT '',
         value NUMERIC(12,4) NOT NULL DEFAULT 0,
         min_qty NUMERIC(18,3) NOT NULL DEFAULT 0,
         start_at TEXT, end_at TEXT, is_active INTEGER NOT NULL DEFAULT 1,
         created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))""",
    "ALTER TABLE sales ADD COLUMN promotion_id INTEGER REFERENCES promotions(id)",
    "ALTER TABLE sales ADD COLUMN promotion_discount NUMERIC(12,2) NOT NULL DEFAULT 0",
    # --- approvals (§15) ---
    """CREATE TABLE IF NOT EXISTS approvals (
         id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL,
         entity TEXT NOT NULL DEFAULT '', entity_id TEXT NOT NULL DEFAULT '',
         requester_id INTEGER REFERENCES users(id), approver_id INTEGER REFERENCES users(id),
         old_value TEXT DEFAULT '', new_value TEXT DEFAULT '', reason TEXT DEFAULT '',
         amount NUMERIC(12,2), status TEXT NOT NULL DEFAULT 'pending'
           CHECK (status IN ('pending','approved','rejected')),
         created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
         decided_at TEXT)""",
    "CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)",
    # --- print jobs (§18: print status recorded separately) ---
    """CREATE TABLE IF NOT EXISTS print_jobs (
         id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL DEFAULT 'receipt',
         reference TEXT NOT NULL DEFAULT '', payload TEXT NOT NULL DEFAULT '',
         status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','ok','failed')),
         message TEXT DEFAULT '', user_id INTEGER REFERENCES users(id),
         created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))""",
    # --- sync outbox (§27: local outbox, pluggable transport) ---
    """CREATE TABLE IF NOT EXISTS outbox (
         id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
         status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
         attempts INTEGER NOT NULL DEFAULT 0, next_retry_at TEXT, last_error TEXT DEFAULT '',
         created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))""",
    "CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status, next_retry_at)",
    # --- audit checkpoints (tamper-evidence over append-only log) ---
    """CREATE TABLE IF NOT EXISTS audit_checkpoints (
         id INTEGER PRIMARY KEY AUTOINCREMENT, up_to_id INTEGER NOT NULL, sha256 TEXT NOT NULL,
         note TEXT DEFAULT '',
         created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))""",
    # --- unit traceability on transaction lines (§8) ---
    "ALTER TABLE purchase_items ADD COLUMN unit_id INTEGER REFERENCES product_units(id)",
    "ALTER TABLE purchase_items ADD COLUMN unit_qty NUMERIC(18,3)",
    "ALTER TABLE sale_items ADD COLUMN unit_id INTEGER REFERENCES product_units(id)",
    "ALTER TABLE sale_items ADD COLUMN unit_qty NUMERIC(18,3)",
    # --- helpful indexes for scale ---
    "CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id)",    "CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id)",
    "CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id)",
]


def _rebuild_cash_sessions(conn: sqlite3.Connection) -> None:
    """Widen status CHECK to the OPEN→ACTIVE→CLOSING→CLOSED lifecycle (§13)."""
    cols = [r[1] for r in conn.execute("PRAGMA table_info(cash_sessions)").fetchall()]
    if cols and "status" in cols:
        chk = conn.execute(
            "SELECT sql FROM sqlite_master WHERE name='cash_sessions'").fetchone()[0]
        if "closing" in chk:
            return  # already migrated
    conn.execute("ALTER TABLE cash_sessions RENAME TO _old_cash_sessions")
    conn.execute(
        """CREATE TABLE cash_sessions (
             id INTEGER PRIMARY KEY AUTOINCREMENT, terminal_id INTEGER REFERENCES terminals(id),
             user_id INTEGER REFERENCES users(id), opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
             expected_cash NUMERIC(12,2), actual_cash NUMERIC(12,2), difference NUMERIC(12,2),
             status TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','active','closing','closed')),
             opened_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
             closed_at TEXT)""")
    conn.execute(
        """INSERT INTO cash_sessions(id, terminal_id, user_id, opening_cash, expected_cash,
              actual_cash, difference, status, opened_at, closed_at)
           SELECT id, terminal_id, user_id, opening_cash, expected_cash, actual_cash, difference,
              CASE WHEN status='closed' THEN 'closed' ELSE 'open' END, opened_at, closed_at
           FROM _old_cash_sessions""")
    conn.execute("DROP TABLE _old_cash_sessions")
    conn.execute(
        """CREATE UNIQUE INDEX IF NOT EXISTS ux_open_shift
           ON cash_sessions(user_id, terminal_id) WHERE status IN ('open','active','closing')""")


def migrate_1_to_2(conn: sqlite3.Connection) -> None:
    """Run inside the caller's transaction. Safe to re-run (IF NOT EXISTS guards)."""
    for stmt in V2_DDL:
        try:
            conn.execute(stmt)
        except Exception as e:
            msg = str(e).lower()
            # Tolerate re-runs / concurrent races on additive DDL.
            if "duplicate column" in msg or "already exists" in msg:
                continue
            raise
    _rebuild_cash_sessions(conn)
    # Backfill historical unit_cost for truthful margins on old rows.
    # The v1 immutability trigger is dropped for this one-time upgrade backfill
    # and recreated immediately after; the migration itself runs inside the
    # app's upgrade transaction and is covered by the pre-migration backup.
    conn.execute("DROP TRIGGER IF EXISTS trg_sale_items_no_update")
    conn.execute(
        """UPDATE sale_items SET unit_cost =
             (SELECT p.cost_price FROM products p WHERE p.id = sale_items.product_id)
           WHERE unit_cost IS NULL""")
    conn.execute("CREATE TRIGGER trg_sale_items_no_update BEFORE UPDATE ON sale_items"
                 " BEGIN SELECT RAISE(ABORT, 'sale_items immutable'); END")
    # Backfill branch/register context.
    conn.execute("UPDATE terminals SET branch_id = "
                 "(SELECT id FROM branches WHERE code='MAIN') WHERE branch_id IS NULL")
    conn.execute("UPDATE terminals SET register_no='R1' WHERE register_no=''")
    conn.execute("UPDATE sales SET branch_id = "
                 "(SELECT id FROM branches WHERE code='MAIN') WHERE branch_id IS NULL")
