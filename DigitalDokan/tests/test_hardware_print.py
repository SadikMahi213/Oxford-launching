"""R2 Phase 6 tests: HAL simulators, scale parsing, print service job ledger."""
import os
import tempfile
import unittest
from decimal import Decimal

from app.hardware.devices import PrintResult
from app.hardware.peripherals import EscposLabelPrinter, SimulatorDisplay, SimulatorLabelPrinter
from app.hardware.scale import (RegexAdapterScale, SimulatorScale, parse_weight)
from app.hardware.scanner import SimulatorScanner, WedgeScanner, clean_scan
from app.infra.migrations import initialize
from app.printing.receipt import build_receipt
from app.services import auth_service, pos_service, print_service, product_service, purchase_service


class _FakePrinter:
    last_text = ""

    def print_receipt(self, text: str):
        _FakePrinter.last_text = text
        return PrintResult(True, "Printed")


class TestHAL(unittest.TestCase):
    def test_scanner(self):
        self.assertEqual(clean_scan("8901234567890\r\n"), "8901234567890")
        w = WedgeScanner()
        self.assertTrue(w.available())
        self.assertEqual(w.feed("  ABC123\t"), "ABC123")
        self.assertEqual(w.last_scan(), "ABC123")
        s = SimulatorScanner(["A", "B"])
        self.assertEqual((s.last_scan(), s.last_scan(), s.last_scan()), ("A", "B", ""))

    def test_scale_parse(self):
        self.assertEqual(parse_weight(" 2.500 kg", r"([-+]?\d+(?:\.\d+)?)\s*kg").kg, 2.5)
        self.assertEqual(parse_weight("2500g", r"([-+]?\d+(?:\.\d+)?)\s*g", unit="g").kg, 2.5)
        self.assertFalse(parse_weight("no weight here", r"(\d+)").ok)
        self.assertFalse(parse_weight("99999 kg", r"([-+]?\d+(?:\.\d+)?)\s*kg").ok)
        with self.assertRaises(ValueError):
            RegexAdapterScale("no-such-profile")
        sim = SimulatorScale([0.532, 1.0])
        sim.open()
        self.assertEqual(sim.read_kg().kg, 0.532)
        sim.close()
        self.assertFalse(sim.read_kg().ok)

    def test_display_and_label(self):
        d = SimulatorDisplay()
        self.assertTrue(d.show_total("100.00"))
        self.assertEqual(d.last, ("TOTAL", "100.00"))
        lb = SimulatorLabelPrinter()
        self.assertTrue(lb.print_label(sku="S", name="N", price="5", barcode="B", copies=2))
        self.assertEqual(lb.labels[0]["copies"], 2)
        esc = EscposLabelPrinter(_FakePrinter())
        self.assertTrue(esc.print_label(sku="S", name="N", price="5", barcode="B"))
        self.assertIn("S", _FakePrinter.last_text)

    def test_self_tests(self):
        for kind in ("scanner", "scale", "display", "label", "printer"):
            r = print_service.hardware_self_test(kind)
            self.assertTrue(r["ok"], f"{kind}: {r['message']}")
        r = print_service.hardware_self_test("scale_line", raw="WT 1.250 kg")
        self.assertTrue(r["ok"])


class TestPrintService(unittest.TestCase):
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
        self.sale = pos_service.complete_sale(
            self.conn, session=self.owner,
            items=[{"product_id": self.pid, "qty": "2", "unit_price": "70"}],
            payments=[{"method": "cash", "amount": "140"}])

    def tearDown(self):
        self.conn.close()

    def test_receipt_print_records_job(self):
        # No printer configured → NullPrinter path: graceful failure + job row, no raise.
        res = print_service.print_receipt(self.conn, sale_id=self.sale["sale_id"],
                                          session=self.owner, fallback_dir=self.tmp)
        self.assertFalse(res.ok)
        job = self.conn.execute("SELECT * FROM print_jobs ORDER BY id DESC LIMIT 1").fetchone()
        self.assertIsNotNone(job)
        self.assertEqual(job["status"], "failed")
        self.assertEqual(job["reference"], self.sale["invoice_no"])

    def test_reprint_audited(self):
        print_service.print_receipt(self.conn, sale_id=self.sale["sale_id"],
                                    session=self.owner, kind="reprint", fallback_dir=self.tmp)
        row = self.conn.execute("SELECT * FROM audit_logs WHERE action='sale.reprint'").fetchone()
        self.assertIsNotNone(row)

    def test_receipt_widths_and_fields(self):
        det = pos_service.sale_details(self.conn, self.sale["sale_id"])
        biz = {"name": "Shop", "address": "Dhaka", "phone": "01", "bin_no": "123", "tin_no": "456"}
        items = [{"name": "P1", "qty": 2, "unit_price": 70, "line_total": 140, "discount_pct": 10}]
        t42 = build_receipt(business=biz, sale=det["sale"], items=items,
                            payments=det["payments"], width=42, cashier="opu")
        t32 = build_receipt(business=biz, sale=det["sale"], items=items,
                            payments=det["payments"], width=32, cashier="opu")
        for line in t32.splitlines():
            self.assertLessEqual(len(line), 32)
        self.assertIn("BIN: 123", t42)
        self.assertIn("Cashier: opu", t42)
        self.assertIn("(-10%)", t42)
        html = print_service.build_invoice_a4(self.conn, self.sale["sale_id"], cashier="opu")
        self.assertIn(self.sale["invoice_no"], html)
        self.assertIn("<table", html)


if __name__ == "__main__":
    unittest.main()
