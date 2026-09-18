"""R2 Phase 8 tests: license states, editions, transaction gating, history access."""
import base64
import hashlib
import hmac
import json
import os
import tempfile
import time
import unittest

from app.infra import license_manager as lic
from app.infra.migrations import initialize
from app.services import auth_service, pos_service, product_service, purchase_service, report_service


def craft_key(payload: dict, secret: str = "s3cr3t") -> str:
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"DDK1.{body}.{sig}"


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.conn = initialize(os.path.join(self.tmp, "t.db"))
        auth_service.create_user(self.conn, "owner", "Owner", "pass1234", "Owner")
        self.owner = auth_service.login(self.conn, "owner", "pass1234")
        self.pid = product_service.upsert_product(
            self.conn, {"sku": "P1", "name": "P1", "sell_price": 70, "cost_price": 60},
            session=self.owner)
        purchase_service.receive_purchase(
            self.conn, session=self.owner, supplier_id=None,
            items=[{"product_id": self.pid, "qty": "10", "cost": "60"}])

    def tearDown(self):
        self.conn.close()


class TestLicenseStates(Base):
    def test_trial_transacts(self):
        st = lic.status(self.conn)
        self.assertEqual(st.state, "TRIAL")
        self.assertTrue(st.valid and st.can_transact())
        self.assertTrue(st.has_feature("lan"))

    def test_active_and_expiring(self):
        os.environ["DIGITALDOKAN_LICENSE_SECRET"] = "k"
        try:
            lic.activate(self.conn, lic.issue_license("single-store", 365, edition="professional"))
            st = lic.status(self.conn)
            self.assertEqual(st.state, "ACTIVE")
            self.assertTrue(st.can_transact())
            lic.activate(self.conn, lic.issue_license("single-store", 3, edition="basic"))
            st = lic.status(self.conn)
            self.assertEqual(st.state, "EXPIRING")
            self.assertTrue(st.can_transact())
        finally:
            del os.environ["DIGITALDOKAN_LICENSE_SECRET"]

    def test_grace_expired_suspended(self):
        now = int(time.time())
        os.environ["DIGITALDOKAN_LICENSE_SECRET"] = "t-secret"
        try:
            grace = craft_key({"plan": "p", "iat": now - 40 * 86400, "exp": now - 3 * 86400,
                               "device": "", "edition": "professional", "terminals": 1,
                               "branches": 1, "features": [], "state": "active"}, "t-secret")
            lic.activate(self.conn, grace)
            st = lic.status(self.conn)
            self.assertEqual(st.state, "GRACE")
            self.assertTrue(st.can_transact())  # POS keeps working in grace
            old = craft_key({"plan": "p", "iat": now - 60 * 86400, "exp": now - 10 * 86400,
                             "device": "", "edition": "professional", "terminals": 1,
                             "branches": 1, "features": [], "state": "active"}, "t-secret")
            lic.activate(self.conn, old)
            st = lic.status(self.conn)
            self.assertEqual(st.state, "EXPIRED")
            self.assertFalse(st.can_transact())
            sus = craft_key({"plan": "p", "iat": now, "exp": 0, "device": "",
                             "edition": "enterprise", "terminals": 5, "branches": 2,
                             "features": [], "state": "suspended"}, "t-secret")
            with self.assertRaises(ValueError):
                lic.activate(self.conn, sus)
        finally:
            del os.environ["DIGITALDOKAN_LICENSE_SECRET"]

    def test_device_binding_and_bad_sig(self):
        key = lic.issue_license("p", 30, device_bound="other-device", secret="k")
        ok, _, msg = lic.verify_key(key, secret="k")
        self.assertFalse(ok)
        self.assertIn("different device", msg)
        ok, _, _ = lic.verify_key(key + "tampered", secret="k")
        self.assertFalse(ok)

    def test_editions(self):
        self.assertIn("lan", lic.EDITION_FEATURES["professional"])
        self.assertNotIn("lan", lic.EDITION_FEATURES["basic"])
        self.assertIn("multibranch", lic.EDITION_FEATURES["enterprise"])
        os.environ["DIGITALDOKAN_LICENSE_SECRET"] = "k"
        try:
            lic.activate(self.conn, lic.issue_license("basic", 365, edition="basic"))
            st = lic.status(self.conn)
            self.assertFalse(st.has_feature("lan"))
            self.assertTrue(st.has_feature("pos"))
        finally:
            del os.environ["DIGITALDOKAN_LICENSE_SECRET"]

    def test_expired_blocks_sales_but_not_history(self):
        now = int(time.time())
        os.environ["DIGITALDOKAN_LICENSE_SECRET"] = "t-secret"
        try:
            old = craft_key({"plan": "p", "iat": now - 60 * 86400, "exp": now - 10 * 86400,
                             "device": "", "edition": "professional", "terminals": 1,
                             "branches": 1, "features": [], "state": "active"}, "t-secret")
            lic.activate(self.conn, old)
            with self.assertRaises(lic.LicenseError):
                pos_service.complete_sale(
                    self.conn, session=self.owner,
                    items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
                    payments=[{"method": "cash", "amount": "70"}])
            with self.assertRaises(lic.LicenseError):
                purchase_service.receive_purchase(
                    self.conn, session=self.owner, supplier_id=None,
                    items=[{"product_id": self.pid, "qty": "1", "cost": "60"}])
            # Historical data stays readable: reports + backup + audit.
            self.assertIn("revenue", report_service.profit_summary(self.conn))
            from app.infra import backup as backupmod
            m = backupmod.create_backup(self.conn, os.path.join(self.tmp, "b"))
            self.assertTrue(m["sha256"])
            self.assertGreaterEqual(
                self.conn.execute("SELECT COUNT(*) c FROM audit_logs").fetchone()["c"], 1)
        finally:
            del os.environ["DIGITALDOKAN_LICENSE_SECRET"]


if __name__ == "__main__":
    unittest.main()
