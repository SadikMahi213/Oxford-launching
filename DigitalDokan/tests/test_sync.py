"""R2 Phase 7 tests: outbox capture inside transactions + retry engine semantics."""
import os
import tempfile
import unittest
from decimal import Decimal

from app.infra.migrations import initialize
from app.services import auth_service, pos_service, product_service, purchase_service
from app.sync.outbox import enqueue, process_outbox


class FakeTransport:
    def __init__(self, fail_times: int = 0):
        self.fail_times = fail_times
        self.sent: list[tuple[str, dict]] = []
        self.calls = 0

    def send(self, topic: str, payload: dict) -> None:
        self.calls += 1
        if self.calls <= self.fail_times:
            raise ConnectionError("cloud down")
        self.sent.append((topic, payload))


class TestOutbox(unittest.TestCase):
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
        self.conn.execute("DELETE FROM outbox")  # isolate each test's events
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_events_captured_in_txn(self):
        pos_service.complete_sale(
            self.conn, session=self.owner,
            items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
            payments=[{"method": "cash", "amount": "70"}])
        topics = [r["topic"] for r in
                  self.conn.execute("SELECT topic FROM outbox ORDER BY id").fetchall()]
        self.assertIn("sale.completed", topics)
        self.assertEqual(len(topics), 1)  # only this sale's event (setUp cleared)

    def test_rollback_removes_event(self):
        n0 = self.conn.execute("SELECT COUNT(*) c FROM outbox").fetchone()["c"]
        with self.assertRaises(ValueError):
            pos_service.complete_sale(
                self.conn, session=self.owner,
                items=[{"product_id": self.pid, "qty": "1", "unit_price": "70"}],
                payments=[{"method": "nope", "amount": "70"}])
        n1 = self.conn.execute("SELECT COUNT(*) c FROM outbox").fetchone()["c"]
        self.assertEqual(n0, n1)

    def test_retry_then_success(self):
        enqueue(self.conn, "test.evt", {"a": 1})
        self.conn.commit()
        t = FakeTransport(fail_times=1)
        r1 = process_outbox(self.conn, t)
        self.assertEqual((r1["sent"], r1["failed"]), (0, 1))
        attempts = self.conn.execute("SELECT attempts FROM outbox").fetchone()["attempts"]
        self.assertEqual(attempts, 1)
        # Force due (backoff is in the future) and retry.
        self.conn.execute("UPDATE outbox SET next_retry_at='2000-01-01T00:00:00Z'")
        self.conn.commit()
        r2 = process_outbox(self.conn, t)
        self.assertEqual(r2["sent"], 1)
        self.assertEqual(t.sent[0][0], "test.evt")

    def test_gives_up_after_max(self):
        enqueue(self.conn, "test.doomed", {})
        self.conn.commit()
        t = FakeTransport(fail_times=999)
        for _ in range(12):
            self.conn.execute("UPDATE outbox SET next_retry_at='2000-01-01T00:00:00Z'"
                              " WHERE status='pending'")
            self.conn.commit()
            process_outbox(self.conn, t)
        st = self.conn.execute("SELECT status, attempts FROM outbox").fetchone()
        self.assertEqual(st["status"], "failed")
        self.assertGreaterEqual(st["attempts"], 10)


if __name__ == "__main__":
    unittest.main()
