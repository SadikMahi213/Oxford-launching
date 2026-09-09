"""R2 Phase 5 tests: unit conversions, promotion engine, favorites, sale integration."""
import os
import tempfile
import unittest
from decimal import Decimal

from app.domain import promotions, units
from app.domain.units import convert_qty, set_conversion
from app.infra.migrations import initialize
from app.services import auth_service, pos_service, product_service, purchase_service, reconcile


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.conn = initialize(os.path.join(self.tmp, "t.db"))
        auth_service.create_user(self.conn, "owner", "Owner", "pass1234", "Owner")
        self.owner = auth_service.login(self.conn, "owner", "pass1234")
        self.piece = self.conn.execute("SELECT id FROM product_units WHERE name='Piece'").fetchone()["id"]
        self.kg = self.conn.execute("SELECT id FROM product_units WHERE name='Kilogram'").fetchone()["id"]
        self.conn.execute("INSERT INTO product_units(name, symbol) VALUES('Carton','ctn')")
        self.conn.execute("INSERT INTO product_units(name, symbol) VALUES('Gram','g')")
        self.conn.commit()
        self.carton = self.conn.execute("SELECT id FROM product_units WHERE name='Carton'").fetchone()["id"]
        self.gram = self.conn.execute("SELECT id FROM product_units WHERE name='Gram'").fetchone()["id"]
        self.conn.execute("INSERT INTO product_categories(name) VALUES('Grocery')")
        self.conn.commit()
        self.cat = self.conn.execute("SELECT id FROM product_categories WHERE name='Grocery'").fetchone()["id"]
        self.pid = product_service.upsert_product(
            self.conn, {"sku": "RICE-1", "name": "Rice", "sell_price": 70, "cost_price": 60,
                        "unit_id": self.piece, "category_id": self.cat}, session=self.owner)

    def tearDown(self):
        self.conn.close()


class TestUnits(Base):
    def test_direct_inverse_identity(self):
        set_conversion(self.conn, self.carton, self.piece, 24, session=self.owner)
        self.assertEqual(convert_qty(self.conn, 2, self.carton, self.piece), Decimal("48.000"))
        self.assertEqual(convert_qty(self.conn, 48, self.piece, self.carton), Decimal("2.000"))
        self.assertEqual(convert_qty(self.conn, 5, self.piece, self.piece), Decimal("5.000"))
        self.assertEqual(convert_qty(self.conn, 5, None, self.piece), Decimal("5.000"))
        set_conversion(self.conn, self.kg, self.gram, 1000, session=self.owner)
        self.assertEqual(convert_qty(self.conn, Decimal("0.532"), self.kg, self.gram),
                         Decimal("532.000"))

    def test_missing_and_bad(self):
        with self.assertRaises(ValueError):
            convert_qty(self.conn, 1, self.carton, self.gram)
        with self.assertRaises(ValueError):
            set_conversion(self.conn, self.piece, self.piece, 1, session=self.owner)
        with self.assertRaises(ValueError):
            set_conversion(self.conn, self.piece, self.kg, 0, session=self.owner)

    def test_carton_purchase_stocks_pieces(self):
        set_conversion(self.conn, self.carton, self.piece, 24, session=self.owner)
        product_service.upsert_product(
            self.conn, {"sku": "RICE-1", "name": "Rice", "sell_price": 70, "cost_price": 60,
                        "unit_id": self.piece, "purchase_unit_id": self.carton}, session=self.owner)
        pr = purchase_service.receive_purchase(
            self.conn, session=self.owner, supplier_id=None,
            items=[{"product_id": self.pid, "qty": "2", "cost": "1440", "unit_id": self.carton}])
        self.assertEqual(product_service.stock_of(self.conn, self.pid), Decimal("48"))
        row = self.conn.execute("SELECT qty, cost, unit_id, unit_qty FROM purchase_items"
                                " WHERE purchase_id=?", (pr["purchase_id"],)).fetchone()
        self.assertEqual((Decimal(str(row["qty"])), Decimal(str(row["cost"]))),
                         (Decimal("48"), Decimal("60.00")))
        self.assertEqual(reconcile.check_stock(self.conn, self.pid), [])

    def test_carton_sale_normalizes_price(self):
        set_conversion(self.conn, self.carton, self.piece, 24, session=self.owner)
        product_service.upsert_product(
            self.conn, {"sku": "RICE-1", "name": "Rice", "sell_price": 70, "cost_price": 60,
                        "unit_id": self.piece, "sell_unit_id": self.carton}, session=self.owner)
        purchase_service.receive_purchase(
            self.conn, session=self.owner, supplier_id=None,
            items=[{"product_id": self.pid, "qty": "100", "cost": "60"}])
        res = pos_service.complete_sale(
            self.conn, session=self.owner,
            items=[{"product_id": self.pid, "qty": "1", "unit_price": "1440", "unit_id": self.carton}],
            payments=[{"method": "cash", "amount": "1440"}])
        self.assertEqual(res["totals"].grand_total, Decimal("1440.00"))
        self.assertEqual(product_service.stock_of(self.conn, self.pid), Decimal("76"))
        self.assertEqual(reconcile.verify_database(self.conn), [])


class TestPromotions(Base):
    def _stock(self):
        purchase_service.receive_purchase(
            self.conn, session=self.owner, supplier_id=None,
            items=[{"product_id": self.pid, "qty": "100", "cost": "60"}])

    def test_kinds_and_best_pick(self):
        self._stock()
        p1 = promotions.create_promotion(self.conn, {"name": "TenPct", "kind": "percent",
                                                     "value": 10}, session=self.owner)
        p2 = promotions.create_promotion(self.conn, {"name": "Flat5", "kind": "fixed",
                                                     "value": 5}, session=self.owner)
        p3 = promotions.create_promotion(self.conn, {"name": "Cat20", "kind": "category_percent",
                                                     "target": str(self.cat), "value": 20},
                                         session=self.owner)
        lines = [{"product_id": self.pid, "qty": Decimal("2"), "gross": Decimal("140.00"),
                  "category_id": self.cat}]
        best = promotions.evaluate(self.conn, lines, Decimal("140.00"))
        self.assertEqual(best.promotion_id, p3)  # 28 > 14 > 5
        self.assertEqual(best.discount, Decimal("28.00"))
        # Explicit selection.
        only = promotions.evaluate(self.conn, lines, Decimal("140.00"), promotion_id=p2)
        self.assertEqual(only.discount, Decimal("5.00"))
        with self.assertRaises(ValueError):
            promotions.evaluate(self.conn, lines, Decimal("140.00"), promotion_id=9999)
        self.assertSetEqual({p1, p2, p3},
                            {p["id"] for p in promotions.active_promotions(self.conn)})

    def test_group_window_minqty_and_validation(self):
        self.conn.execute("INSERT INTO customer_groups(name, discount_pct) VALUES('Staff', 15)")
        self.conn.commit()
        vip = self.conn.execute("SELECT id FROM customer_groups WHERE name='VIP'").fetchone()["id"]
        from app.services import party_service
        cid = party_service.create_customer(self.conn, "VIP Guy", session=self.owner)
        self.conn.execute("UPDATE customers SET group_id=? WHERE id=?", (vip, cid))
        self.conn.commit()
        promotions.create_promotion(self.conn, {"name": "Grp10", "kind": "group_percent",
                                                "target": str(vip), "value": 10}, session=self.owner)
        promotions.create_promotion(self.conn, {"name": "Old", "kind": "percent", "value": 50,
                                                "start_at": "2020-01-01T00:00:00Z",
                                                "end_at": "2020-02-01T00:00:00Z"}, session=self.owner)
        lines = [{"product_id": self.pid, "qty": Decimal("1"), "gross": Decimal("70.00"),
                  "category_id": self.cat}]
        best = promotions.evaluate(self.conn, lines, Decimal("70.00"), customer_id=cid)
        self.assertEqual(best.discount, Decimal("7.00"))  # expired 50% ignored
        other = promotions.evaluate(self.conn, lines, Decimal("70.00"), customer_id=None)
        self.assertIsNone(other)
        with self.assertRaises(ValueError):
            promotions.create_promotion(self.conn, {"kind": "nope", "value": 1}, session=self.owner)
        with self.assertRaises(ValueError):
            promotions.create_promotion(self.conn, {"kind": "percent", "value": 150},
                                        session=self.owner)

    def test_sale_with_auto_promotion_reconciles(self):
        self._stock()
        promotions.create_promotion(self.conn, {"name": "TenPct", "kind": "percent", "value": 10},
                                    session=self.owner)
        res = pos_service.complete_sale(
            self.conn, session=self.owner,
            items=[{"product_id": self.pid, "qty": "2", "unit_price": "70"}],
            payments=[{"method": "cash", "amount": "126"}], auto_promotion=True)
        self.assertEqual(res["totals"].promotion_discount, Decimal("14.00"))
        self.assertEqual(res["totals"].grand_total, Decimal("126.00"))
        self.assertIsNotNone(res["promotion_id"])
        self.assertEqual(reconcile.verify_database(self.conn), [])

    def test_margin_uses_historical_cost(self):
        self._stock()
        pos_service.complete_sale(
            self.conn, session=self.owner,
            items=[{"product_id": self.pid, "qty": "2", "unit_price": "70"}],
            payments=[{"method": "cash", "amount": "140"}])
        # Cost changes afterwards; margin must still reflect cost at sale time (60).
        product_service.upsert_product(self.conn, {"sku": "RICE-1", "name": "Rice",
                                                   "sell_price": 70, "cost_price": 90},
                                       session=self.owner)
        from app.services import report_service
        rows = report_service.product_sales(self.conn)
        self.assertEqual(Decimal(str(rows[0]["profit_est"])), Decimal("20"))


class TestFavorites(Base):
    def test_favorite_flag_and_list(self):
        self.assertEqual(product_service.list_favorites(self.conn), [])
        product_service.upsert_product(self.conn, {"sku": "RICE-1", "name": "Rice",
                                                   "sell_price": 70, "is_favorite": 1},
                                       session=self.owner)
        favs = product_service.list_favorites(self.conn)
        self.assertEqual(len(favs), 1)
        self.assertEqual(favs[0]["sku"], "RICE-1")


if __name__ == "__main__":
    unittest.main()
