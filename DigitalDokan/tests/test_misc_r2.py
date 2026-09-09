"""R2 Phase 11 tests: i18n parity, optional export adapters, data-dir config."""
import json
import os
import tempfile
import unittest
from pathlib import Path

from app import config as configmod
from app.i18n.manager import strings, t
from app.infra.migrations import initialize
from app.services import auth_service, import_export_service, pos_service, product_service


class TestI18n(unittest.TestCase):
    def test_parity_and_fallback(self):
        en, bn = strings("en"), strings("bn")
        self.assertEqual(set(en), set(bn))
        self.assertGreaterEqual(len(en), 40)
        self.assertEqual(t("bn", "pos"), bn["pos"])
        self.assertNotEqual(t("bn", "pos"), "pos")
        self.assertEqual(t("bn", "no.such.key"), "no.such.key")
        for p in (Path(__file__).parent.parent / "app" / "i18n").glob("*.json"):
            json.loads(p.read_text(encoding="utf-8"))  # valid JSON, UTF-8


class TestExports(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.conn = initialize(os.path.join(self.tmp, "t.db"))
        auth_service.create_user(self.conn, "owner", "Owner", "pass1234", "Owner")
        owner = auth_service.login(self.conn, "owner", "pass1234")
        pid = product_service.upsert_product(
            self.conn, {"sku": "P1", "name": "P1", "sell_price": 70}, session=owner)
        self.conn.execute("INSERT INTO inventory_batches(product_id, qty) VALUES(?,50)", (pid,))
        self.conn.commit()
        pos_service.complete_sale(
            self.conn, session=owner, items=[{"product_id": pid, "qty": "1", "unit_price": "70"}],
            payments=[{"method": "cash", "amount": "70"}])

    def tearDown(self):
        self.conn.close()

    def test_xlsx_graceful_without_dep(self):
        try:
            import openpyxl  # noqa: F401
            have = True
        except ImportError:
            have = False
        if have:
            out = os.path.join(self.tmp, "sales.xlsx")
            import_export_service.export_sales_xlsx(self.conn, out)
            self.assertGreater(os.path.getsize(out), 0)
        else:
            with self.assertRaises(RuntimeError) as cm:
                import_export_service.export_sales_xlsx(self.conn, os.path.join(self.tmp, "x.xlsx"))
            self.assertIn("openpyxl", str(cm.exception))

    def test_pdf_export(self):
        try:
            import reportlab  # noqa: F401
        except ImportError:
            self.skipTest("reportlab not installed")
            return
        out = os.path.join(self.tmp, "sales.pdf")
        import_export_service.export_sales_pdf(self.conn, out)
        self.assertGreater(os.path.getsize(out), 0)


class TestDataDirs(unittest.TestCase):
    def test_override_and_layout(self):
        target = os.path.join(tempfile.mkdtemp(), "dd-data")
        os.environ["DIGITALDOKAN_DATA_DIR"] = target
        try:
            cfg = configmod.AppConfig()
            self.assertEqual(cfg.app_data_dir, target)
            cfg.ensure_dirs()
            for d in (cfg.db_path and cfg.backup_dir, cfg.logs_dir, cfg.licenses_dir):
                self.assertTrue(os.path.isdir(d), d)
        finally:
            del os.environ["DIGITALDOKAN_DATA_DIR"]

    def test_default_names(self):
        cfg = configmod.AppConfig()
        self.assertIn("DigitalDokan", cfg.app_data_dir)
        self.assertTrue(cfg.db_path.endswith("digitaldokan.db"))


if __name__ == "__main__":
    unittest.main()
