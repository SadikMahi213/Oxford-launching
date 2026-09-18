"""Pricing engine: single place where subtotal/discount/VAT/rounding/total are defined."""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import List

from app.domain.money import to_money, money_pct


@dataclass
class CartLine:
    product_id: int
    name: str
    qty: Decimal
    unit_price: Decimal
    discount_pct: Decimal = Decimal("0")
    vat_pct: Decimal = Decimal("0")

    def line_gross(self) -> Decimal:
        return (to_money(self.unit_price) * self.qty).quantize(Decimal("0.01"))

    def line_discount(self) -> Decimal:
        return money_pct(self.line_gross(), self.discount_pct)

    def line_net(self) -> Decimal:
        return to_money(self.line_gross() - self.line_discount())

    def line_vat(self) -> Decimal:
        # VAT applied on net (configurable policy documented in ADMIN_MANUAL).
        return money_pct(self.line_net(), self.vat_pct)


@dataclass
class Totals:
    subtotal: Decimal
    item_discount: Decimal
    invoice_discount: Decimal
    promotion_discount: Decimal = Decimal("0.00")
    vat_total: Decimal = Decimal("0.00")
    rounding: Decimal = Decimal("0.00")
    grand_total: Decimal = Decimal("0.00")
    paid: Decimal = Decimal("0.00")
    due: Decimal = Decimal("0.00")
    change: Decimal = Decimal("0.00")


def compute_totals(
    lines: List[CartLine],
    invoice_discount: Decimal | str | int | float = Decimal("0"),
    paid: Decimal | str | int | float = Decimal("0"),
    vat_inclusive: bool = False,
    promotion_discount: Decimal | str | int | float = Decimal("0"),
) -> Totals:
    """Deterministic totals. VAT-inclusive means unit_price already contains VAT
    (no additional VAT added); otherwise VAT is added on top of net."""
    subtotal = Decimal("0.00")
    item_disc = Decimal("0.00")
    vat_total = Decimal("0.00")
    for ln in lines:
        if ln.qty <= 0:
            raise ValueError("Quantity must be positive")
        if ln.unit_price < 0:
            raise ValueError("Price cannot be negative")
        subtotal += ln.line_gross()
        item_disc += ln.line_discount()
        if not vat_inclusive:
            vat_total += ln.line_vat()
    subtotal = to_money(subtotal)
    item_disc = to_money(item_disc)
    vat_total = to_money(vat_total)
    inv_disc = to_money(invoice_discount)
    promo_disc = to_money(promotion_discount)
    net = to_money(subtotal - item_disc - inv_disc - promo_disc + vat_total)
    if net < 0:
        raise ValueError("Discounts exceed payable amount")
    # Cash rounding to nearest 1 BDT is applied only at payment for cash tenders;
    # stored rounding keeps audit trail. Default: round to 2 decimals (no-op).
    grand = to_money(net)
    rounding = to_money(grand - net)
    paid_m = to_money(paid)
    if paid_m < 0:
        raise ValueError("Paid amount cannot be negative")
    due = to_money(grand - paid_m) if paid_m < grand else Decimal("0.00")
    change = to_money(paid_m - grand) if paid_m > grand else Decimal("0.00")
    return Totals(
        subtotal=subtotal,
        item_discount=item_disc,
        invoice_discount=inv_disc,
        promotion_discount=promo_disc,
        vat_total=vat_total,
        rounding=rounding,
        grand_total=grand,
        paid=paid_m,
        due=due,
        change=change,
    )
