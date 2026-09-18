"""R2 Phase 11 tests: report groupings, receivables/payables, reconciliation,
pagination, shift lifecycle guards."""
import os
import tempfile
import unittest
from decimal import Decimal

from app.infra.migrations import initialize
from app.services import (auth_service, party_service, pos_service, product_service,
                          purchase_service, report_service, shift_service)


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.conn = initialize(os.path.join(self.tmp, "t.db"))
        auth_service.create_user(self.conn, "owner", "Owner", "pass1234", "Owner")
        self.owner = auth_service.login(self.conn, "owner", "pass1234")
        self.pid = product_service.upsert_product(
            self.conn, {"sku": "P1", "name": "P1", "sell_price": 100, "cost_price": 60},
            session=self.owner)
        purchase_service.receive_purchase(
            self.conn, session=self.owner, supplier_id=None,
            items=[{"product_id": self.pid, "qty": "100", "cost": "60"}])

    def tearDown(self):
        self.conn.close()


class TestReports(Base):
    def test_groupings(self):
        pos_service.complete_sale(
            self.conn, session=self.owner,
            items=[{"product_id": self.pid, "qty": "2", "unit_price": "100"}],
            payments=[{"method": "cash", "amount": "200"}])
        for g in ("day", "month", "week", "hour", "cashier", "payment", "register", "branch"):
            rows = report_service.sales_summary(self.conn, group_by=g, session=self.owner)
            self.assertTrue(rows, g)
        pay = report_service.sales_summary(self.conn, group_by="payment", session=self.owner)
        self.assertEqual(pay[0]["bucket"], "cash")
        reg = report_service.sales_summary(self.conn, group_by="register", session=self.owner)
        self.assertEqual(reg[0]["bucket"], "R1")  # terminal default register
        br = report_service.sales_summary(self.conn, group_by="branch", session=self.owner)
        self.assertEqual(br[0]["bucket"], "MAIN")

    def test_receivables_payables(self):
        cid = party_service.create_customer(self.conn, "C1", session=self.owner)
        pos_service.complete_sale(
            self.conn, session=self.owner,
            items=[{"product_id": self.pid, "qty": "1", "unit_price": "100"}],
            payments=[{"method": "due", "amount": "0"}], customer_id=cid)
        rec = report_service.receivables(self.conn, session=self.owner)
        self.assertEqual(len(rec), 1)
        self.assertEqual(Decimal(str(rec[0]["balance"])), Decimal("100.00"))
        sup = party_service.create_supplier(self.conn, "S1", session=self.owner)
        purchase_service.receive_purchase(
            self.conn, session=self.owner, supplier_id=sup,
            items=[{"product_id": self.pid, "qty": "5", "cost": "60"}])
        pay = report_service.payables(self.conn, session=self.owner)
        self.assertEqual(len(pay), 1)
        self.assertEqual(Decimal(str(pay[0]["balance"])), Decimal("300.00"))

    def test_reconciliation_matches_close(self):
        sid = shift_service.open_shift(self.conn, session=self.owner, opening_cash=Decimal("50"))
        pos_service.complete_sale(
            self.conn, session=self.owner,
            items=[{"product_id": self.pid, "qty": "1", "unit_price": "100"}],
            payments=[{"method": "cash", "amount": "100"}], shift_id=sid)
        rec = report_service.cash_reconciliation(self.conn, sid, session=self.owner)
        self.assertEqual(Decimal(rec["expected_cash"]), Decimal("150"))
        closed = shift_service.close_shift(self.conn, session=self.owner, shift_id=sid,
                                           actual_cash=Decimal("150"))
        self.assertEqual(closed["expected"], Decimal("150.00"))

    def test_pagination(self):
        for i in range(25):
            product_service.upsert_product(
                self.conn, {"sku": f"S-{i:02d}", "name": f"S {i}", "sell_price": 10},
                session=self.owner)
        p1 = report_service.paginate(self.conn, "SELECT id FROM products ORDER BY id",
                                     (), page=1, per_page=10, session=self.owner)
        self.assertEqual((p1["total"], len(p1["rows"]), p1["pages"], p1["page"]), (26, 10, 3, 1))
        p3 = report_service.paginate(self.conn, "SELECT id FROM products ORDER BY id",
                                     (), page=3, per_page=10, session=self.owner)
        self.assertEqual(len(p3["rows"]), 6)


class TestShiftLifecycle(Base):
    def test_guards_and_reopen(self):
        sid = shift_service.open_shift(self.conn, session=self.owner)
        shift_service.set_shift_state(self.conn, session=self.owner, shift_id=sid, state="active")
        shift_service.set_shift_state(self.conn, session=self.owner, shift_id=sid, state="closing")
        shift_service.close_shift(self.conn, session=self.owner, shift_id=sid,
                                  actual_cash=Decimal("0"))
        with self.assertRaises(ValueError):
            shift_service.cash_io(self.conn, session=self.owner, shift_id=sid,
                                  direction="in", amount=Decimal("10"))
        with self.assertRaises(ValueError):
            shift_service.set_shift_state(self.conn, session=self.owner, shift_id=sid,
                                          state="open")
        # Correction needs shift.correct (owner has *) + reason.
        shift_service.reopen_shift(self.conn, session=self.owner, shift_id=sid,
                                   reason="recount", approver=self.owner)
        st = self.conn.execute("SELECT status FROM cash_sessions WHERE id=?", (sid,)).fetchone()["status"]
        self.assertEqual(st, "closing")
        with self.assertRaises(ValueError):
            shift_service.reopen_shift(self.conn, session=self.owner, shift_id=sid,
                                       reason="x", approver=self.owner)


if __name__ == "__main__":
    unittest.main()
