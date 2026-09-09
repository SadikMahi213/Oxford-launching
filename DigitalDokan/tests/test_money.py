"""Unit tests: money + pricing invariants (no floats for money)."""
import unittest
from decimal import Decimal

from app.domain.money import to_money, money_pct, format_bdt
from app.domain.pricing import CartLine, compute_totals


class TestMoney(unittest.TestCase):
    def test_quantize(self):
        self.assertEqual(to_money("10.005"), Decimal("10.01"))
        self.assertEqual(to_money(10), Decimal("10.00"))

    def test_rejects_bad(self):
        with self.assertRaises(ValueError):
            to_money("abc")
        with self.assertRaises(ValueError):
            money_pct(100, 150)

    def test_totals_invariant(self):
        lines = [CartLine(1, "Rice", Decimal("2"), Decimal("70.00"), Decimal("10"), Decimal("0")),
                 CartLine(2, "Oil", Decimal("1"), Decimal("150.00"), Decimal("0"), Decimal("5"))]
        t = compute_totals(lines, invoice_discount=Decimal("5"), paid=Decimal("300"))
        # subtotal=290, item_disc=14, vat=7.5 -> grand=278.50
        self.assertEqual(t.subtotal, Decimal("290.00"))
        self.assertEqual(t.item_discount, Decimal("14.00"))
        self.assertEqual(t.vat_total, Decimal("7.50"))
        self.assertEqual(t.grand_total, Decimal("278.50"))
        self.assertEqual(t.due, Decimal("0.00"))
        self.assertEqual(t.change, Decimal("21.50"))
        self.assertIn("৳", format_bdt(t.grand_total))

    def test_discount_cannot_exceed(self):
        with self.assertRaises(ValueError):
            compute_totals([CartLine(1, "X", Decimal("1"), Decimal("10"))],
                           invoice_discount=Decimal("50"))


if __name__ == "__main__":
    unittest.main()
