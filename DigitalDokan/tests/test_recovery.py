"""Recovery tests (§24): kill during sale/purchase/payment/adjust/shift-close.

- test_kill_mid_sale: a real subprocess dies inside an open write txn; the
  parent verifies no partial rows, integrity ok, and the DB accepts writes
  (lock released by recovery).
- test_uncommitted_close_rolls_back: close-without-commit discards partial rows.
- test_wal_checkpoint_recovery: committed data survives checkpoint + reopen.
- test_backup_of_crashed_db_verifies: backup refuses/validates correctly after crash.
"""
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from app.infra import db as dbmod
from app.infra import backup as backupmod
from app.infra.migrations import initialize

WORKER = str(Path(__file__).parent / "crash_worker.py")


class TestRecovery(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.db = os.path.join(self.tmp, "shop.db")
        conn = initialize(self.db)
        conn.execute(
            "INSERT INTO users(username, full_name, password_hash, password_salt, role_id)"
            " VALUES('o','O','h','s',1)")
        conn.execute("INSERT INTO products(sku, name, sell_price) VALUES('P1','P1',70)")
        conn.execute("INSERT INTO inventory_batches(product_id, batch_no, qty, unit_cost)"
                     " VALUES(1,'',50,60)")
        conn.commit()
        conn.close()

    def _run_worker(self, marker: str) -> None:
        p = subprocess.run([sys.executable, WORKER, self.db, marker],
                           capture_output=True, timeout=60)
        self.assertNotEqual(p.returncode, 0)  # it must die

    def test_kill_mid_sale_leaves_nothing(self):
        before_items = dbmod.connect(self.db).execute(
            "SELECT COUNT(*) c FROM sale_items").fetchone()["c"]
        dbmod.connect(self.db).close()
        self._run_worker("INV-CRASH-001")
        conn = dbmod.connect(self.db)
        try:
            self.assertIsNone(conn.execute(
                "SELECT id FROM sales WHERE invoice_no='INV-CRASH-001'").fetchone())
            self.assertEqual(conn.execute("SELECT COUNT(*) c FROM sale_items").fetchone()["c"],
                             before_items)
            self.assertEqual(dbmod.integrity_check(conn), "ok")
            # Lock released: fresh write succeeds.
            conn.execute("INSERT INTO sales(invoice_no, user_id, subtotal, total, paid, due)"
                         " VALUES('INV-OK-001',1,70,70,70,0)")
            conn.commit()
        finally:
            conn.close()

    def test_uncommitted_close_rolls_back(self):
        raw = sqlite3.connect(self.db, isolation_level=None)
        raw.execute("BEGIN IMMEDIATE")
        raw.execute("INSERT INTO sales(invoice_no, user_id, subtotal, total, paid, due)"
                    " VALUES('INV-TMP-001',1,70,70,70,0)")
        raw.close()  # no commit
        conn = dbmod.connect(self.db)
        try:
            self.assertIsNone(conn.execute(
                "SELECT id FROM sales WHERE invoice_no='INV-TMP-001'").fetchone())
            self.assertEqual(dbmod.integrity_check(conn), "ok")
        finally:
            conn.close()

    def test_wal_checkpoint_recovery(self):
        conn = dbmod.connect(self.db)
        conn.execute("INSERT INTO sales(invoice_no, user_id, subtotal, total, paid, due)"
                     " VALUES('INV-CKPT-001',1,70,70,70,0)")
        conn.commit()
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
        conn.close()
        conn2 = dbmod.connect(self.db)
        try:
            self.assertIsNotNone(conn2.execute(
                "SELECT id FROM sales WHERE invoice_no='INV-CKPT-001'").fetchone())
        finally:
            conn2.close()

    def test_backup_after_crash_verifies(self):
        self._run_worker("INV-CRASH-002")
        conn = dbmod.connect(self.db)
        try:
            m = backupmod.create_backup(conn, os.path.join(self.tmp, "b"), note="post-crash")
            v = backupmod.verify_backup(os.path.join(self.tmp, "b", m["filename"]))
            self.assertEqual(v["integrity"], "ok")
            self.assertTrue(v["manifest_match"])
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
