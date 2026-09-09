"""Migrations + seed of system roles/permissions/settings (idempotent)."""
from __future__ import annotations

import sqlite3
from app.infra import db as dbmod
from app.version import __db_version__

PERMISSIONS = [
    ("sell", "Can sell / operate POS"),
    ("refund", "Can process sales returns"),
    ("cancel_invoice", "Can cancel invoices"),
    ("give_discount", "Can give discounts"),
    ("change_price", "Can change price at POS"),
    ("adjust_stock", "Can adjust stock"),
    ("edit_product", "Can create/edit products"),
    ("delete_product", "Can deactivate products"),
    ("see_profit", "Can see profit/cost"),
    ("see_cost", "Can see cost price"),
    ("access_reports", "Can access reports"),
    ("manage_users", "Can manage users/roles"),
    ("backup", "Can perform backup"),
    ("restore", "Can restore database"),
    ("manage_settings", "Can change settings"),
    ("approve", "Can approve manager-restricted actions"),
]

ROLE_DEFS: dict[str, list[str]] = {
    "Super Admin": ["*"],
    "Owner": ["*"],
    "Manager": ["sell", "refund", "cancel_invoice", "give_discount", "change_price",
                "adjust_stock", "edit_product", "access_reports", "see_profit",
                "see_cost", "backup", "manage_settings", "approve"],
    "Cashier": ["sell"],
    "Inventory Manager": ["adjust_stock", "edit_product", "see_cost", "access_reports"],
    "Accountant": ["access_reports", "see_profit", "see_cost", "manage_settings"],
    "Supervisor": ["sell", "refund", "give_discount", "access_reports", "approve"],
}


def _perm_id(conn: sqlite3.Connection, code: str) -> int:
    row = conn.execute("SELECT id FROM permissions WHERE code=?", (code,)).fetchone()
    return int(row["id"])


def seed_system(conn: sqlite3.Connection) -> None:
    for code, desc in PERMISSIONS:
        conn.execute("INSERT OR IGNORE INTO permissions(code, description) VALUES(?,?)", (code, desc))
    for role, perms in ROLE_DEFS.items():
        conn.execute("INSERT OR IGNORE INTO roles(name, description, is_system) VALUES(?,?,1)", (role, role))
        rid = conn.execute("SELECT id FROM roles WHERE name=?", (role,)).fetchone()["id"]
        codes = [p[0] for p in PERMISSIONS] if perms == ["*"] else perms
        for c in codes:
            conn.execute("INSERT OR IGNORE INTO role_permissions(role_id, permission_id) VALUES(?,?)",
                         (rid, _perm_id(conn, c)))
    conn.execute("INSERT OR IGNORE INTO businesses(id, name) VALUES(1, 'My Store')");
    conn.execute("INSERT OR IGNORE INTO terminals(code, name) VALUES('POS-01','Counter 1')");
    conn.execute("INSERT OR IGNORE INTO taxes(name, pct) VALUES('VAT', 0)");
    conn.execute("INSERT OR IGNORE INTO product_units(name, symbol) VALUES('Piece','pc')");
    conn.execute("INSERT OR IGNORE INTO product_units(name, symbol) VALUES('Kilogram','kg')");
    conn.execute("INSERT OR IGNORE INTO product_units(name, symbol) VALUES('Liter','L')");
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Rent')");
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Electricity')");
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Salary')");
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Transport')");
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Miscellaneous')");
    conn.execute("INSERT OR IGNORE INTO schema_version(version) VALUES(?)", (__db_version__,))


def initialize(db_path: str) -> sqlite3.Connection:
    conn = dbmod.connect(db_path)
    try:
        dbmod.load_schema(conn)
        with conn:  # atomic seed
            seed_system(conn)
        return conn
    except Exception:
        conn.close()
        raise
