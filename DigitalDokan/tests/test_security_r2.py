"""R2 Phase 10 tests: password rotation, audit checkpoints/tamper, login audit,
diagnostics hygiene (no secrets/PII)."""
import os
import sqlite3
import tempfile
import unittest

from app.infra.migrations import initialize
from app.services import audit_service, auth_service, diagnostics


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.conn = initialize(os.path.join(self.tmp, "t.db"))
        auth_service.create_user(self.conn, "owner", "Owner", "pass1234", "Owner")
        auth_service.create_user(self.conn, "cashier", "Cashier", "pass1234", "Cashier")
        self.owner = auth_service.login(self.conn, "owner", "pass1234")

    def tearDown(self):
        self.conn.close()


class TestRotation(Base):
    def test_forced_rotation_flow(self):
        auth_service.set_password(self.conn, session=self.owner, user_id=self.owner.user_id,
                                  new_password="BrandNew1", must_change=True)
        with self.assertRaises(auth_service.PasswordChangeRequired):
            auth_service.login(self.conn, "owner", "BrandNew1")
        auth_service.change_password(self.conn, self.owner.user_id, "BrandNew1", "FinalPass1")
        sess = auth_service.login(self.conn, "owner", "FinalPass1")
        self.assertEqual(sess.username, "owner")
        with self.assertRaises(ValueError):
            auth_service.change_password(self.conn, self.owner.user_id, "wrong", "Xxxx1234")
        # Cashier cannot reset others.
        cashier = auth_service.login(self.conn, "cashier", "pass1234")
        with self.assertRaises(PermissionError):
            auth_service.set_password(self.conn, session=cashier, user_id=self.owner.user_id,
                                      new_password="Hack1234")

    def test_bootstrap_admin_forces_change(self):
        conn2 = initialize(os.path.join(self.tmp, "fresh.db"))
        try:
            self.assertTrue(auth_service.bootstrap_admin(conn2))
            with self.assertRaises(auth_service.PasswordChangeRequired):
                auth_service.login(conn2, "admin", "Admin@123")
        finally:
            conn2.close()


class TestAuditChain(Base):
    def test_checkpoint_and_verify(self):
        self.assertIsNotNone(audit_service.checkpoint(self.conn, "daily"))
        self.assertIsNone(audit_service.checkpoint(self.conn, "nothing-new"))
        self.assertEqual(audit_service.verify_checkpoints(self.conn), [])
        auth_service.login(self.conn, "cashier", "pass1234")
        self.assertIsNotNone(audit_service.checkpoint(self.conn, "more"))
        self.assertEqual(audit_service.verify_checkpoints(self.conn), [])

    def test_file_tamper_detected(self):
        audit_service.checkpoint(self.conn, "base")
        # Quiesce (WAL→main) before the file copy, else recent rows are missed.
        self.conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
        self.conn.close()
        copy = os.path.join(self.tmp, "copy.db")
        with open(os.path.join(self.tmp, "t.db"), "rb") as src, open(copy, "wb") as dst:
            dst.write(src.read())
        c = sqlite3.connect(copy)
        c.execute("DROP TRIGGER trg_audit_no_update")
        c.execute("UPDATE audit_logs SET new_value='forged' WHERE id=1")
        c.commit()
        c.close()
        from app.infra import db as dbmod
        conn = dbmod.connect(copy)
        try:
            issues = audit_service.verify_checkpoints(conn)
            self.assertTrue(issues)
            self.assertIn("tampered", issues[0])
        finally:
            conn.close()

    def test_login_audit_rows(self):
        try:
            auth_service.login(self.conn, "nosuchuser", "x")
        except ValueError:
            pass
        rows = audit_service.search(self.conn, action="login.failed")
        self.assertGreaterEqual(len(rows), 1)
        rows = audit_service.search(self.conn, action="login.success", entity="user")
        self.assertGreaterEqual(len(rows), 1)
        rows = audit_service.search(self.conn, user_id=999999)
        self.assertEqual(rows, [])


class TestDiagnostics(Base):
    def test_collect_has_no_secrets(self):
        d = diagnostics.collect(self.conn, backup_dir=self.tmp)
        text = diagnostics.format_text(d)
        self.assertIn("Integrity:", text)
        self.assertIn("License:", text)
        blob = str(d)
        for banned in ("pass1234", "password_hash", "pin_hash", "signature", "salt"):
            self.assertNotIn(banned, blob)
        self.assertIn("counts", d)
        self.assertIn("outbox_pending", d)


if __name__ == "__main__":
    unittest.main()
