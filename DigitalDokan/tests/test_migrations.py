"""R2 migration framework tests: fresh-init, v1→v2 upgrade, rollback, UoW.

Builds a synthetic Release-1 database from the frozen schema_v1.sql snapshot,
puts real business data in it, then upgrades through the production path.
"""
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app.infra import db as dbmod
from app.infra import migrations as mig
from app.infra.uow import unit_of_work
from app.version import __db_version__

SCHEMA_V1 = Path(__file__).parent.parent / "app" / "infra" / "schema_v1.sql"


def make_r1_db(path: str) -> sqlite3.Connection:
    """Minimal but real R1 database: v1 DDL + v1-era seed + business data."""
    conn = dbmod.connect(path)
    conn.executescript(SCHEMA_V1.read_text(encoding="utf-8"))
    with conn:
        conn.execute("INSERT INTO roles(name, description, is_system) VALUES('Owner','Owner',1)")
        conn.execute("INSERT INTO permissions(code, description) VALUES('sell','sell')")
        conn.execute("INSERT INTO role_permissions(role_id, permission_id) VALUES(1,1)")
        conn.execute(
            "INSERT INTO users(username, full_name, password_hash, password_salt, role_id)"
            " VALUES('owner','Owner','h','s',1)")
        conn.execute("INSERT INTO businesses(id, name) VALUES(1, 'R1 Shop')")
        conn.execute("INSERT INTO terminals(code, name) VALUES('POS-01','Counter 1')")
        conn.execute(
            "INSERT INTO products(sku, name, barcode, cost_price, sell_price)"
            " VALUES('RICE-1','Rice','1001',60,70)")
        conn.execute(
            "INSERT INTO inventory_batches(product_id, batch_no, qty, unit_cost)"
            " VALUES(1,'',100,60)")
        conn.execute(
            "INSERT INTO inventory_movements(product_id, batch_id, qty_change, qty_after,"
            " source_type, source_id, user_id) VALUES(1,1,100,100,'opening',0,1)")
        conn.execute(
            "INSERT INTO sales(invoice_no, user_id, subtotal, total, paid, due)"
            " VALUES('INV-2026-000001',1,140,140,140,0)")
        conn.execute(
            "INSERT INTO sale_items(sale_id, product_id, qty, unit_price, line_total)"
            " VALUES(1,1,2,70,140)")
        conn.execute(
            "INSERT INTO sale_payments(sale_id, method, amount) VALUES(1,'cash',140)")
        conn.execute(
            "INSERT INTO audit_logs(user_id, action, entity, entity_id) VALUES(1,'sale.completed','sale','INV-2026-000001')")
        conn.execute("INSERT INTO schema_version(version) VALUES(1)")
    return conn


class TestMigrations(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.db = os.path.join(self.tmp, "shop.db")

    def test_fresh_initialize_lands_on_v2(self):
        conn = mig.initialize(self.db)
        try:
            self.assertEqual(mig.get_db_version(conn), __db_version__)
            self.assertEqual(__db_version__, 2)
            for tbl in ("branches", "approvals", "outbox", "promotions", "print_jobs",
                        "purchase_return_items", "stock_transfer_items", "unit_conversions",
                        "customer_groups", "audit_checkpoints"):
                conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()
            n = conn.execute("SELECT COUNT(*) c FROM permissions").fetchone()["c"]
            self.assertGreaterEqual(n, 40)  # R1 + dotted R2 codes
            roles = {r["name"] for r in conn.execute("SELECT name FROM roles").fetchall()}
            self.assertIn("Auditor", roles)
            self.assertIn("Branch Manager", roles)
        finally:
            conn.close()

    def test_v1_upgrade_preserves_data(self):
        conn = make_r1_db(self.db)
        conn.close()
        rep = mig.migrate_db(self.db)
        self.assertEqual((rep["from"], rep["to"], rep["status"]), (1, 2, "migrated"))
        self.assertTrue(rep["backup"] and os.path.exists(rep["backup"]))
        conn = dbmod.connect(self.db)
        try:
            self.assertEqual(mig.get_db_version(conn), 2)
            # Business data intact.
            self.assertEqual(conn.execute("SELECT name FROM products WHERE sku='RICE-1'").fetchone()["name"], "Rice")
            self.assertEqual(conn.execute("SELECT total FROM sales WHERE invoice_no='INV-2026-000001'").fetchone()["total"], 140)
            self.assertEqual(conn.execute("SELECT COUNT(*) c FROM audit_logs").fetchone()["c"], 1)
            self.assertEqual(conn.execute("SELECT COUNT(*) c FROM inventory_movements").fetchone()["c"], 1)
            # Backfills applied.
            self.assertEqual(conn.execute("SELECT unit_cost FROM sale_items WHERE sale_id=1").fetchone()["unit_cost"], 60)
            self.assertEqual(conn.execute("SELECT code FROM branches WHERE id="
                                          "(SELECT branch_id FROM sales WHERE id=1)").fetchone()["code"], "MAIN")
            # Idempotent re-run.
        finally:
            conn.close()
        rep2 = mig.migrate_db(self.db)
        self.assertEqual(rep2["status"], "current")

    def test_downgrade_refused(self):
        conn = make_r1_db(self.db)
        with conn:
            conn.execute("UPDATE schema_version SET version=99")
        conn.close()
        with self.assertRaises(RuntimeError):
            mig.migrate_db(self.db)

    def test_failed_migration_rolls_back(self):
        conn = make_r1_db(self.db)
        conn.close()
        real = mig.MIGRATIONS[2]

        def boom(c):
            c.execute("CREATE TABLE _should_not_survive(x)")
            raise RuntimeError("simulated migration crash")
        mig.MIGRATIONS[2] = boom
        try:
            with self.assertRaises(RuntimeError):
                mig.migrate_db(self.db)
        finally:
            mig.MIGRATIONS[2] = real
        conn = dbmod.connect(self.db)
        try:
            self.assertEqual(mig.get_db_version(conn), 1)  # version untouched
            self.assertIsNone(conn.execute(
                "SELECT name FROM sqlite_master WHERE name='_should_not_survive'").fetchone())
            self.assertEqual(conn.execute("SELECT total FROM sales WHERE id=1").fetchone()["total"], 140)
            self.assertEqual(dbmod.integrity_check(conn), "ok")
        finally:
            conn.close()


class TestUoW(unittest.TestCase):
    def test_commit_and_rollback(self):
        conn = dbmod.connect(":memory:")
        conn.execute("CREATE TABLE t(x)")
        with unit_of_work(conn):
            conn.execute("INSERT INTO t VALUES(1)")
        self.assertEqual(conn.execute("SELECT COUNT(*) c FROM t").fetchone()["c"], 1)
        with self.assertRaises(ValueError):
            with unit_of_work(conn):
                conn.execute("INSERT INTO t VALUES(2)")
                raise ValueError("boom")
        self.assertEqual(conn.execute("SELECT COUNT(*) c FROM t").fetchone()["c"], 1)
        # Nested joins ambient transaction.
        with unit_of_work(conn):
            with unit_of_work(conn):
                conn.execute("INSERT INTO t VALUES(3)")
        self.assertEqual(conn.execute("SELECT COUNT(*) c FROM t").fetchone()["c"], 2)
        conn.close()


if __name__ == "__main__":
    unittest.main()
