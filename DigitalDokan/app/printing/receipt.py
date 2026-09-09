"""Receipt/invoice builders (thermal 80/58mm text + A4 data model)."""
from __future__ import annotations

from decimal import Decimal


def _line(width: int, left: str, right: str) -> str:
    space = max(1, width - len(left) - len(right))
    return f"{left}{' ' * space}{right}"


def build_receipt(*, business: dict, sale: dict, items: list[dict], payments: list[dict],
                  width: int = 42) -> str:
    L = []
    c = lambda s: str(s or "").center(width)
    L.append(c(business.get("name", "Store")))
    if business.get("address"):
        L.append(c(business["address"]))
    if business.get("phone"):
        L.append(c("Tel: " + business["phone"]))
    if business.get("bin_no"):
        L.append(c("BIN: " + business["bin_no"]))
    L.append("-" * width)
    L.append(_line(width, f"INV: {sale['invoice_no']}", str(sale.get("created_at", ""))[:16]))
    L.append("-" * width)
    for it in items:
        L.append(f"{it['name'][:width]}")
        L.append(_line(width, f"  {it['qty']} x {it['unit_price']}", f"{it['line_total']}"))
    L.append("-" * width)
    L.append(_line(width, "Subtotal:", str(sale["subtotal"])))
    if Decimal(str(sale.get("item_discount", 0))) or Decimal(str(sale.get("invoice_discount", 0))):
        L.append(_line(width, "Discount:",
                        str(Decimal(str(sale.get("item_discount", 0))) + Decimal(str(sale.get("invoice_discount", 0))))))
    if Decimal(str(sale.get("vat", 0))):
        L.append(_line(width, "VAT:", str(sale["vat"])))
    L.append(_line(width, "TOTAL:", str(sale["total"])))
    for p in payments:
        L.append(_line(width, f"Paid ({p['method']}):", str(p["amount"])))
    L.append(_line(width, "Change:", str(sale.get("change_amount", 0))))
    if Decimal(str(sale.get("due", 0))) > 0:
        L.append(_line(width, "DUE:", str(sale["due"])))
    L.append("-" * width)
    footer = business.get("receipt_footer") or "Thank you for shopping with us!"
    L.append(c(footer))
    return "\n".join(L)
