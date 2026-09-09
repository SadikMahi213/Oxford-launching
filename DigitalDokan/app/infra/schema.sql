-- DigitalDokan schema v1. SQLite, offline-first single-store.
-- Conventions: TEXT money as NUMERIC(12,2) stored via Decimal strings; UTC ISO datetimes.
PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '', is_system INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, description TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL,
  pin_hash TEXT, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id), is_active INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL, address TEXT DEFAULT '', phone TEXT DEFAULT '',
  bin_no TEXT DEFAULT '', tin_no TEXT DEFAULT '', vat_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_inclusive INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'BDT',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV', language TEXT NOT NULL DEFAULT 'en',
  receipt_footer TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS terminals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS taxes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
  pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (pct >= 0 AND pct <= 100), is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS invoice_sequences (
  prefix TEXT NOT NULL, year TEXT NOT NULL, last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);

CREATE TABLE IF NOT EXISTS product_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, name_bn TEXT DEFAULT '',
  requires_batch INTEGER NOT NULL DEFAULT 0, requires_expiry INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS product_brands (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS product_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, symbol TEXT DEFAULT '',
  allows_decimal INTEGER NOT NULL DEFAULT 1, base_factor NUMERIC(18,6) NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL, name_bn TEXT DEFAULT '',
  category_id INTEGER REFERENCES product_categories(id), brand_id INTEGER REFERENCES product_brands(id),
  unit_id INTEGER REFERENCES product_units(id),
  barcode TEXT, cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sell_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
  wholesale_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (wholesale_price >= 0),
  vat_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (vat_pct >= 0 AND vat_pct <= 100),
  min_stock NUMERIC(18,3) NOT NULL DEFAULT 0, reorder_level NUMERIC(18,3) NOT NULL DEFAULT 0,
  track_batch INTEGER NOT NULL DEFAULT 0, track_expiry INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE TABLE IF NOT EXISTS product_barcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS product_suppliers (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL, last_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT DEFAULT '', address TEXT DEFAULT '',
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0, balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS supplier_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), method TEXT NOT NULL DEFAULT 'cash',
  note TEXT DEFAULT '', user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE, address TEXT DEFAULT '',
  customer_type TEXT NOT NULL DEFAULT 'regular', credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0, loyalty_points INTEGER NOT NULL DEFAULT 0,
  price_tier TEXT NOT NULL DEFAULT 'retail', is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE TABLE IF NOT EXISTS customer_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), method TEXT NOT NULL DEFAULT 'cash',
  note TEXT DEFAULT '', user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT NOT NULL UNIQUE, supplier_id INTEGER REFERENCES suppliers(id),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0, due NUMERIC(12,2) NOT NULL DEFAULT 0,
  user_id INTEGER REFERENCES users(id), note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id), batch_no TEXT DEFAULT '', expiry_date TEXT,
  qty NUMERIC(18,3) NOT NULL CHECK (qty > 0), cost NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
  line_total NUMERIC(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS purchase_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT, purchase_id INTEGER NOT NULL REFERENCES purchases(id),
  total NUMERIC(12,2) NOT NULL, reason TEXT DEFAULT '', user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS inventory_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id),
  batch_no TEXT DEFAULT '', expiry_date TEXT, mfg_date TEXT,
  qty NUMERIC(18,3) NOT NULL DEFAULT 0, unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE (product_id, batch_no)
);
CREATE TABLE IF NOT EXISTS inventory_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id),
  batch_id INTEGER REFERENCES inventory_batches(id), qty_change NUMERIC(18,3) NOT NULL,
  qty_after NUMERIC(18,3) NOT NULL, source_type TEXT NOT NULL, source_id INTEGER NOT NULL,
  reason TEXT DEFAULT '', user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_source ON inventory_movements(source_type, source_id);
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, reason TEXT NOT NULL, note TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id), approved_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS stock_adjustment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, adjustment_id INTEGER NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id), qty_change NUMERIC(18,3) NOT NULL
);
CREATE TABLE IF NOT EXISTS stock_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, from_note TEXT DEFAULT '', to_note TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT NOT NULL UNIQUE, terminal_id INTEGER REFERENCES terminals(id),
  customer_id INTEGER REFERENCES customers(id), user_id INTEGER REFERENCES users(id),
  subtotal NUMERIC(12,2) NOT NULL, item_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  invoice_discount NUMERIC(12,2) NOT NULL DEFAULT 0, vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  rounding NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0, due NUMERIC(12,2) NOT NULL DEFAULT 0, change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','cancelled','held')),
  cancel_reason TEXT DEFAULT '', cancelled_by INTEGER REFERENCES users(id),
  shift_id INTEGER, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id), batch_id INTEGER REFERENCES inventory_batches(id),
  qty NUMERIC(18,3) NOT NULL CHECK (qty > 0), unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0, vat_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS sale_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  method TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0), reference TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sale_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL REFERENCES sales(id),
  total NUMERIC(12,2) NOT NULL, reason TEXT DEFAULT '', user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sale_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, return_id INTEGER NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id), qty NUMERIC(18,3) NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(12,2) NOT NULL, line_total NUMERIC(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS held_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, note TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS expense_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER REFERENCES expense_categories(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), method TEXT NOT NULL DEFAULT 'cash',
  note TEXT DEFAULT '', user_id INTEGER REFERENCES users(id), approved_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, terminal_id INTEGER REFERENCES terminals(id),
  user_id INTEGER REFERENCES users(id), opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_cash NUMERIC(12,2), actual_cash NUMERIC(12,2), difference NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  closed_at TEXT
);
CREATE TABLE IF NOT EXISTS cash_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT, shift_id INTEGER REFERENCES cash_sessions(id),
  direction TEXT NOT NULL CHECK (direction IN ('in','out')), amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT DEFAULT '', user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id),
  points INTEGER NOT NULL, source_type TEXT NOT NULL, source_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, terminal_code TEXT DEFAULT '',
  action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL DEFAULT '',
  old_value TEXT DEFAULT '', new_value TEXT DEFAULT '', reason TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, signature TEXT NOT NULL,
  activated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT, fingerprint TEXT NOT NULL UNIQUE, name TEXT DEFAULT '',
  first_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ok', note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS system_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, level TEXT NOT NULL, category TEXT NOT NULL,
  message TEXT NOT NULL, details TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Immutable audit: block UPDATE/DELETE on audit_logs and financial core via triggers.
CREATE TRIGGER IF NOT EXISTS trg_audit_no_update BEFORE UPDATE ON audit_logs BEGIN SELECT RAISE(ABORT, 'audit_logs immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_audit_no_delete BEFORE DELETE ON audit_logs BEGIN SELECT RAISE(ABORT, 'audit_logs immutable'); END;
CREATE TRIGGER IF NOT EXISTS trg_sale_items_no_update BEFORE UPDATE ON sale_items BEGIN SELECT RAISE(ABORT, 'sale_items immutable'); END;
