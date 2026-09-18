"""Integration tests: atomic sales, returns, purchases, shifts, backup, concurrency."""
import os
import sqlite3
import tempfile
import threading
import unittest
from decimal import Decimal

from app.infra import db as dbmod
from app.infra import backup as backupmod
from app.infra.migrations import initialize
from app.services import auth_service, party_service, pos_service, product_service, purchase_service


class _T(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.db = os.path.join(self.tmp, "t.db")
        self.conn = initialize(self.db)
        auth_service.create_user(self.conn, "owner", "Owner", "pass1234", "Owner")
        self.sess = auth_service.login(self.conn, "owner", "pass1234")
        auth_service.create_user(self.conn, "cashier", "Cashier", "pass1234", "Cashier")
        self.cashier = auth_service.login(self.conn, "cashier", "pass1234")
        self.pid = product_service.upsert_product(
            self.conn, {"sku": "RICE-1", "name": "Rice 1kg", "barcode": "1001",
                        "cost_price": 60, "sell_price": 70})
        purchase_service.receive_purchase(
            self.conn, session=self.sess, supplier_id=None,
            items=[{"product_id": self.pid, "qty": "100", "cost": "60"}])

    def tearDown(self):
        self.conn.close()


class TestAtomicSale(_T):
    def test_complete_sale_updates_stock_and_totals(self):
        res = pos_service.complete_sale(
            self.conn, session=self.sess,
            items=[{"product_id": self.pid, "qty": "2", "unit_price": "70"}],
            payments=[{"method": "cash", "amount": "140"}])
        self.assertIn("INV-", res["invoice_no"])
        stock = product_service.stock_of(self.conn, self.pid)
        self.assertEqual(stock, Decimal("98"))
        n = self.conn.execute("SELECT COUNT(*) c FROM inventory_movements").fetchone()["c"]
        self.assertGreaterEqual(n, 2)

    def test_half_write_impossible(self):
        with self.assertRaises(ValueError):
            pos_service.complete_sale(
                self.conn, session=self.sess,
                items=[{"product_id": self.pid, "qty": "5", "unit_price": "70"}],
                payments=[{"method": "weird", "amount": "1"}])
        # stock unchanged, no sale row
        self.assertEqual(product_service.stock_of(self.conn, self.pid), Decimal("100"))
        self.assertEqual(self.conn.execute("SELECT COUNT(*) c FROM sales").fetchone()["c"], 0)

    def test_due_requires_customer_and_limit(self):
        with self.assertRaises(ValueError):
            pos_service.complete_sale(
                self.conn, session=self.sess,
                items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
                payments=[{"method": "due", "amount": "0"}])
        cid = party_service.create_customer(self.conn, "Rahim", "01700000000",
                                            credit_limit=Decimal("50"))
        with self.assertRaises(ValueError):
            pos_service.complete_sale(
                self.conn, session=self.sess,
                items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
                payments=[{"method": "due", "amount": "0"}], customer_id=cid)

    def test_cashier_cannot_discount(self):
        with self.assertRaises(PermissionError):
            pos_service.complete_sale(
                self.conn, session=self.cashier,
                items=[{"product_id": self.pid, "qty": "1", "unit_price": "70",
                        "discount_pct": "10"}],
                payments=[{"method": "cash", "amount": "63"}])

    def test_return_and_cancel_are_reversals(self):
        res = pos_service.complete_sale(
            self.conn, session=self.sess,
            items=[{"product_id": self.pid, "qty": "2", "unit_price": "70"}],
            payments=[{"method": "cash", "amount": "140"}])
        pos_service.process_return(self.conn, session=self.sess, sale_id=res["sale_id"],
                                   items=[{"product_id": self.pid, "qty": "1"}], reason="defect")
        self.assertEqual(product_service.stock_of(self.conn, self.pid), Decimal("99"))
        pos_service.cancel_invoice(self.conn, session=self.sess, sale_id=res["sale_id"],
                                   reason="test cancel")
        st = self.conn.execute("SELECT status FROM sales WHERE id=?",
                               (res["sale_id"],)).fetchone()["status"]
        self.assertEqual(st, "cancelled")
        # audit immutable
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("DELETE FROM audit_logs WHERE id=1")

    def test_invoice_numbers_unique_under_threads(self):
        invoice_nos = []
        lock = threading.Lock()

        def worker():
            c = dbmod.connect(self.db)
            sess = auth_service.login(c, "owner", "pass1234")
            r = pos_service.complete_sale(
                c, session=sess, items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
                payments=[{"method": "cash", "amount": "70"}])
            with lock:
                invoice_nos.append(r["invoice_no"])
            c.close()

        threads = [threading.Thread(target=worker) for _ in range(5)]
        [t.start() for t in threads]
        [t.join() for t in threads]
        self.assertEqual(len(set(invoice_nos)), 5)


class TestBackupRecovery(_T):
    def test_backup_verify(self):
        bdir = os.path.join(self.tmp, "b")
        m = backupmod.create_backup(self.conn, bdir, note="test")
        v = backupmod.verify_backup(os.path.join(bdir, m["filename"]))
        self.assertEqual(v["integrity"], "ok")
        self.assertTrue(v["manifest_match"])

    def test_auth_lockout(self):
        for _ in range(5):
            try:
                auth_service.login(self.conn, "cashier", "wrong")
            except ValueError:
                pass
        with self.assertRaises(ValueError):
            auth_service.login(self.conn, "cashier", "pass1234")


if __name__ == "__main__":
    unittest.main()
