"""R2 Phase 7 tests: LAN server over real HTTP — auth, sales, idempotency,
limited-stock race, RBAC, approvals, shifts/reports, offline policy."""
import os
import tempfile
import threading
import unittest
from decimal import Decimal

from app.server import LanApprovalNeeded, LanClient, LanPermissionError, OfflineError, create_server
from app.services import auth_service, product_service, purchase_service
from app.infra.migrations import initialize


class LanBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.db = os.path.join(cls.tmp, "store.db")
        conn = initialize(cls.db)
        auth_service.create_user(conn, "owner", "Owner", "pass1234", "Owner")
        auth_service.create_user(conn, "cashier", "Cashier", "pass1234", "Cashier")
        conn.execute("INSERT INTO roles(name, description) VALUES('Sales Assistant','t')")
        rid = conn.execute("SELECT id FROM roles WHERE name='Sales Assistant'").fetchone()["id"]
        for code in ("sell", "give_discount"):
            pid = conn.execute("SELECT id FROM permissions WHERE code=?", (code,)).fetchone()["id"]
            conn.execute("INSERT INTO role_permissions(role_id, permission_id) VALUES(?,?)", (rid, pid))
        conn.commit()
        auth_service.create_user(conn, "asst", "Assistant", "pass1234", "Sales Assistant")
        owner = auth_service.login(conn, "owner", "pass1234")
        cls.pid = product_service.upsert_product(
            conn, {"sku": "RICE-1", "name": "Rice", "barcode": "1001",
                   "cost_price": 60, "sell_price": 70}, session=owner)
        purchase_service.receive_purchase(
            conn, session=owner, supplier_id=None,
            items=[{"product_id": cls.pid, "qty": "500", "cost": "60"}])
        conn.close()
        cls.server = create_server(cls.db, "127.0.0.1", 0, secret="test-secret").start()
        cls.url = cls.server.url

    @classmethod
    def tearDownClass(cls):
        cls.server.stop()

    def client(self, user="owner", pw="pass1234", terminal="POS-01"):
        c = LanClient(self.url, terminal)
        c.login(user, pw)
        return c


class TestLan(LanBase):
    def test_health_no_auth(self):
        c = LanClient(self.url)
        h = c.health()
        self.assertEqual(h["integrity"], "ok")
        self.assertIn("license", h)

    def _set_stock(self, qty: str) -> None:
        from app.infra import db as dbmod
        conn = dbmod.connect(self.db)
        try:
            conn.execute("UPDATE inventory_batches SET qty=? WHERE product_id=?", (qty, self.pid))
            conn.commit()
        finally:
            conn.close()

    def _stock(self) -> Decimal:
        from app.infra import db as dbmod
        conn = dbmod.connect(self.db)
        try:
            return Decimal(str(conn.execute(
                "SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                (self.pid,)).fetchone()["s"]))
        finally:
            conn.close()

    def test_catalog_and_sale(self):
        c = self.client()
        self.assertTrue(c.search("rice"))
        self.assertEqual(c.barcode("1001")["sku"], "RICE-1")
        self._set_stock("500")
        res = c.create_sale(items=[{"product_id": self.pid, "qty": "2", "unit_price": "70"}],
                            payments=[{"method": "cash", "amount": "140"}],
                            idempotency_key="lan-t1")
        self.assertIn("INV-", res["invoice_no"])
        self.assertEqual(self._stock(), Decimal("498"))

    def test_idempotent_retry(self):
        c = self.client()
        kw = dict(items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
                  payments=[{"method": "cash", "amount": "70"}], idempotency_key="lan-dup-1")
        r1 = c.create_sale(**kw)
        r2 = c.create_sale(**kw)
        self.assertEqual(r1["sale_id"], r2["sale_id"])
        self.assertTrue(r2.get("duplicate"))

    def test_limited_stock_race(self):
        c1 = self.client(terminal="POS-01")
        c2 = self.client(terminal="POS-02")
        # Exactly 2 units: two concurrent buy-2 requests → one winner, no oversell.
        self._set_stock("2")
        results, errors = [], []

        def buy(client, key):
            try:
                results.append(client.create_sale(
                    items=[{"product_id": self.pid, "qty": "2", "unit_price": "70"}],
                    payments=[{"method": "cash", "amount": "140"}], idempotency_key=key))
            except Exception as e:  # noqa: BLE001 - asserting below
                errors.append(str(e))

        t1 = threading.Thread(target=buy, args=(c1, "race-1"))
        t2 = threading.Thread(target=buy, args=(c2, "race-2"))
        t1.start()
        t2.start()
        t1.join()
        t2.join()
        self.assertEqual(len(results), 1)  # exactly one winner, no oversell
        self.assertEqual(len(errors), 1)
        self._set_stock("500")  # restore for other tests

    def test_rbac_over_wire(self):
        c = self.client("cashier")
        with self.assertRaises(LanPermissionError):
            c.return_sale(1, items=[])
        with self.assertRaises(LanPermissionError):
            c.register_terminal("POS-99")

    def test_approval_over_wire(self):
        asst = self.client("asst")
        with self.assertRaises(LanApprovalNeeded) as cm:
            asst.create_sale(items=[{"product_id": self.pid, "qty": "1", "unit_price": "70",
                                     "discount_pct": "50"}],
                             payments=[{"method": "cash", "amount": "35"}],
                             idempotency_key="lan-appr-1")
        self.assertGreater(cm.exception.approval_id, 0)
        mgr = self.client("owner")
        mgr_token = mgr.token
        res = asst.create_sale(items=[{"product_id": self.pid, "qty": "1", "unit_price": "70",
                                       "discount_pct": "50"}],
                               payments=[{"method": "cash", "amount": "35"}],
                               idempotency_key="lan-appr-1", approver_token=mgr_token)
        self.assertIn("INV-", res["invoice_no"])

    def test_shift_reports_terminals(self):
        c = self.client()
        sh = c.shift_open(opening_cash="100")
        c.create_sale(items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
                      payments=[{"method": "cash", "amount": "70"}],
                      shift_id=sh["shift_id"], idempotency_key="lan-shift-1")
        closed = c.shift_close(sh["shift_id"], actual_cash="170")
        self.assertEqual(Decimal(str(closed["difference"])), Decimal("0"))
        self.assertTrue(c.report_sales())
        self.assertTrue(c.report_products())
        self.assertTrue(c.report_stock())
        self.assertIn("revenue", c.report_profit())
        reg = c.register_terminal("POS-02", "Counter 2", "R2")
        self.assertEqual(reg["registered"], "POS-02")

    def test_ops_endpoints(self):
        from app.services import product_service as _ps
        c = self.client()
        # favorites (empty ok, shape check after flagging one via direct service)
        self.assertIsInstance(c.favorites(), list)
        # customer lookup round-trip
        from app.infra import db as dbmod
        conn = dbmod.connect(self.db)
        try:
            from app.services import party_service, auth_service as _auth
            owner = _auth.login(conn, "owner", "pass1234")
            cid = party_service.create_customer(conn, "Lan Guy", phone="01700000001")
        finally:
            conn.close()
        found = c.customer_lookup("01700000001")
        self.assertEqual(found["id"], cid)
        # sale details gating: cashier without refund/reprint/cancel is refused
        sale = c.create_sale(items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
                             payments=[{"method": "cash", "amount": "70"}],
                             idempotency_key="lan-det-1")
        from app.services import auth_service as _auth2
        conn2 = dbmod.connect(self.db)
        try:
            _auth2.create_user(conn2, "auditx", "Audit X", "pass1234", "Auditor")
        finally:
            conn2.close()
        auditor = self.client("auditx")
        with self.assertRaises(Exception):
            auditor.sale_details(sale["sale_id"])
        det = c.sale_details(sale["sale_id"])
        self.assertEqual(det["sale"]["invoice_no"], sale["invoice_no"])
        self.assertEqual(len(det["items"]), 1)
        # lookup by invoice + audited reprint
        lk = c.sale_lookup(sale["invoice_no"])
        self.assertEqual(lk["id"], sale["sale_id"])
        det2 = c.reprint_sale(sale["sale_id"])
        self.assertEqual(det2["sale"]["invoice_no"], sale["invoice_no"])
        conn = dbmod.connect(self.db)
        try:
            audit = conn.execute("SELECT COUNT(*) c FROM audit_logs WHERE action='sale.reprint'"
                                 ).fetchone()["c"]
            self.assertGreaterEqual(audit, 1)
            promos = c.active_promotions()
            self.assertIsInstance(promos, list)
        finally:
            conn.close()

    def test_offline_policy(self):
        dead = LanClient("http://127.0.0.1:9", "POS-01")  # nothing listens here
        with self.assertRaises(OfflineError) as cm:
            dead.create_sale(items=[], payments=[])
        self.assertIn("lan-required", str(cm.exception).lower().replace(" ", "-"))


if __name__ == "__main__":
    unittest.main()
