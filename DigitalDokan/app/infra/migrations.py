"""Versioned migrations: fresh-init + safe upgrade with backup-first + validation.

§35 requirements implemented:
- backup before migration (WAL-checkpointed file copy; no writers hold the handle yet)
- migration version registry (MIGRATIONS), transactional DDL (SQLite DDL is transactional)
- rollback strategy (ROLLBACK + restore pre-migration copy + re-verify)
- migration validation (integrity_check + post-migration checks)
- never silently discard data (additive deltas only; v1 DDL frozen in schema.sql)
"""
from __future__ import annotations

import os
import shutil
import sqlite3
import time

from app.infra import db as dbmod
from app.infra.migrate_v1_v2 import migrate_1_to_2
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
    # R2 dotted codes (§14). R1 flat codes remain valid via auth_service.PERMISSION_ALIASES.
    ("sale.create", "Create sales"),
    ("sale.refund", "Process sales returns"),
    ("sale.cancel", "Cancel invoices"),
    ("sale.reprint", "Reprint receipts/invoices"),
    ("discount.apply", "Apply discounts"),
    ("discount.override", "Override discount limits (with approval)"),
    ("price.change", "Change price at POS"),
    ("product.manage", "Create/edit products"),
    ("inventory.adjust", "Adjust stock"),
    ("inventory.transfer", "Transfer stock"),
    ("purchase.create", "Create purchases / receive goods"),
    ("purchase.approve", "Approve purchases and large returns"),
    ("supplier.payment", "Pay suppliers / manage supplier ledger"),
    ("customer.credit", "Manage customers and credit/due"),
    ("expense.create", "Record expenses"),
    ("shift.manage", "Open shifts and record cash movements"),
    ("shift.close", "Close shifts and reconcile"),
    ("shift.correct", "Correct closed shifts (with approval)"),
    ("report.view", "View reports"),
    ("audit.view", "Search audit logs"),
    ("backup.create", "Create backups"),
    ("backup.restore", "Restore backups"),
    ("user.manage", "Manage users and roles"),
    ("license.manage", "Manage licensing"),
    ("settings.manage", "Change settings"),
    ("approve.action", "Approve sensitive actions"),
    ("terminal.manage", "Register and manage terminals"),
    ("sync.manage", "Manage synchronization"),
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
    # R2 roles (§14).
    "Branch Manager": ["sale.create", "sale.refund", "sale.cancel", "sale.reprint",
                       "discount.apply", "price.change", "inventory.adjust", "purchase.create",
                       "supplier.payment", "customer.credit", "expense.create", "shift.manage",
                       "shift.close", "report.view", "audit.view", "user.manage",
                       "product.manage", "approve.action"],
    "Auditor": ["report.view", "audit.view", "see_profit", "see_cost"],
}

MIGRATIONS = {
    2: migrate_1_to_2,
}


def get_db_version(conn: sqlite3.Connection) -> int:
    try:
        row = conn.execute("SELECT MAX(version) v FROM schema_version").fetchone()
    except Exception:
        return 0
    return int(row["v"]) if row and row["v"] is not None else 0


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
    conn.execute("INSERT OR IGNORE INTO businesses(id, name) VALUES(1, 'My Store')")
    conn.execute("INSERT OR IGNORE INTO terminals(code, name) VALUES('POS-01','Counter 1')")
    conn.execute("INSERT OR IGNORE INTO taxes(name, pct) VALUES('VAT', 0)")
    conn.execute("INSERT OR IGNORE INTO product_units(name, symbol) VALUES('Piece','pc')")
    conn.execute("INSERT OR IGNORE INTO product_units(name, symbol) VALUES('Kilogram','kg')")
    conn.execute("INSERT OR IGNORE INTO product_units(name, symbol) VALUES('Liter','L')")
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Rent')")
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Electricity')")
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Salary')")
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Transport')")
    conn.execute("INSERT OR IGNORE INTO expense_categories(name) VALUES('Miscellaneous')")
    from app.services import approval_service as _appr
    _appr.seed_defaults(conn)


def _file_copy_backup(db_path: str) -> str:
    """WAL-checkpointed file copy used as the pre-migration safety net."""
    conn = dbmod.connect(db_path)
    try:
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    finally:
        conn.close()
    ts = time.strftime("%Y%m%d-%H%M%S")
    dest = db_path + f".pre-migrate-{ts}.bak"
    shutil.copy2(db_path, dest)
    return dest


def _validate(conn: sqlite3.Connection) -> list[str]:
    issues: list[str] = []
    if dbmod.integrity_check(conn) != "ok":
        issues.append("integrity_check failed")
    for tbl in ("sales", "products", "inventory_movements", "audit_logs", "schema_version",
                "approvals", "outbox", "promotions", "branches"):
        try:
            conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()
        except Exception as e:
            issues.append(f"table {tbl} missing/broken: {e}")
    dup = conn.execute(
        "SELECT invoice_no FROM sales GROUP BY invoice_no HAVING COUNT(*) > 1 LIMIT 1").fetchone()
    if dup:
        issues.append(f"duplicate invoice_no: {dup[0]}")
    return issues


def migrate_db(db_path: str, backup_first: bool = True) -> dict:
    """Upgrade db_path to __db_version__. Returns a report dict. Raises on failure
    after restoring the pre-migration copy (failed-migration rollback)."""
    if not os.path.exists(db_path):
        raise FileNotFoundError(db_path)
    conn = dbmod.connect(db_path)
    try:
        current = get_db_version(conn)
    except Exception:
        conn.close()
        raise
    if current > __db_version__:
        conn.close()
        raise RuntimeError(f"Database v{current} is newer than app v{__db_version__} - refusing downgrade")
    if current == __db_version__:
        with conn:
            seed_system(conn)  # idempotent: picks up new permissions/roles
        conn.close()
        return {"from": current, "to": current, "migrated": [], "backup": None, "status": "current"}
    if dbmod.integrity_check(conn) != "ok":
        conn.close()
        raise RuntimeError("Pre-migration integrity check failed - migrate refused")
    safety_copy = _file_copy_backup(db_path) if backup_first else None
    conn.close()

    conn = dbmod.connect(db_path)
    applied: list[int] = []
    try:
        for ver in sorted(MIGRATIONS):
            if ver <= current or ver > __db_version__:
                continue
            conn.execute("BEGIN IMMEDIATE")
            try:
                MIGRATIONS[ver](conn)
                conn.execute("INSERT OR IGNORE INTO schema_version(version) VALUES(?)", (ver,))
                conn.commit()
                applied.append(ver)
            except Exception:
                conn.rollback()
                raise
        with conn:
            seed_system(conn)
        issues = _validate(conn)
        if issues:
            raise RuntimeError("Post-migration validation failed: " + "; ".join(issues))
        conn.close()
        return {"from": current, "to": __db_version__, "migrated": applied,
                "backup": safety_copy, "status": "migrated"}
    except Exception:
        try:
            conn.close()
        except Exception:
            pass
        if safety_copy and os.path.exists(safety_copy):
            # Failed-migration rollback: restore the safety copy, remove journals, re-verify.
            for suffix in ("", "-wal", "-shm", "-journal"):
                p = db_path + suffix
                if os.path.exists(p):
                    os.remove(p)
            shutil.copy2(safety_copy, db_path)
            chk = dbmod.connect(db_path)
            try:
                ok = dbmod.integrity_check(chk) == "ok"
            finally:
                chk.close()
            if not ok:
                raise RuntimeError("Migration failed AND rollback copy is corrupt - "
                                   f"manual recovery from {safety_copy} required")
        raise


def initialize(db_path: str) -> sqlite3.Connection:
    fresh = not os.path.exists(db_path)
    conn = dbmod.connect(db_path)
    try:
        dbmod.load_schema(conn)  # frozen v1 DDL
        with conn:
            seed_system(conn)
            if fresh:
                conn.execute("INSERT OR IGNORE INTO schema_version(version) VALUES(1)")
        conn.close()
    except Exception:
        conn.close()
        raise
    # Bring to current version through the tested upgrade path (also used by updater).
    migrate_db(db_path)
    return dbmod.connect(db_path)
