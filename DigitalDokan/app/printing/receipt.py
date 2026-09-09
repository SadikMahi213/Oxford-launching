"""Receipt/invoice builders (thermal 80mm/42col + 58mm/32col text)."""
from __future__ import annotations

from decimal import Decimal


def _line(width: int, left: str, right: str) -> str:
    left, right = str(left), str(right)
    if len(left) + len(right) + 1 > width:
        left = left[: max(0, width - len(right) - 2)] + "…"
    space = max(1, width - len(left) - len(right))
    return f"{left}{' ' * space}{right}"


def build_receipt(*, business: dict, sale: dict, items: list[dict], payments: list[dict],
                  width: int = 42, cashier: str = "", register: str = "",
                  branch: str = "", footer: str | None = None) -> str:
    L = []
    c = lambda s: str(s or "").center(width)
    L.append(c(business.get("name", "Store")))
    if business.get("address"):
        L.append(c(business["address"]))
    if business.get("phone"):
        L.append(c("Tel: " + business["phone"]))
    if business.get("bin_no"):
        L.append(c("BIN: " + business["bin_no"]))
    if business.get("tin_no"):
        L.append(c("TIN: " + business["tin_no"]))
    if branch:
        L.append(c(branch))
    L.append("-" * width)
    L.append(_line(width, f"INV: {sale['invoice_no']}", str(sale.get("created_at", ""))[:16]))
    if cashier or register:
        L.append(_line(width, f"Cashier: {cashier}", f"Reg: {register}"))
    L.append("-" * width)
    for it in items:
        L.append(f"{it['name'][:width]}")
        qty_line = f"  {it['qty']} x {it['unit_price']}"
        if Decimal(str(it.get("discount_pct", 0))):
            qty_line += f" (-{it['discount_pct']}%)"
        L.append(_line(width, qty_line, f"{it['line_total']}"))
    L.append("-" * width)
    L.append(_line(width, "Subtotal:", str(sale["subtotal"])))
    if Decimal(str(sale.get("item_discount", 0))):
        L.append(_line(width, "Item discount:", str(sale["item_discount"])))
    if Decimal(str(sale.get("invoice_discount", 0))):
        L.append(_line(width, "Invoice discount:", str(sale["invoice_discount"])))
    if Decimal(str(sale.get("promotion_discount", 0))):
        L.append(_line(width, "Promotion:", str(sale["promotion_discount"])))
    if Decimal(str(sale.get("vat", 0))):
        L.append(_line(width, "VAT:", str(sale["vat"])))
    L.append(_line(width, "TOTAL:", str(sale["total"])))
    for p in payments:
        ref = f" [{p['reference']}]" if p.get("reference") else ""
        L.append(_line(width, f"Paid ({p['method']}){ref}:", str(p["amount"])))
    L.append(_line(width, "Change:", str(sale.get("change_amount", 0))))
    if Decimal(str(sale.get("due", 0))) > 0:
        L.append(_line(width, "DUE:", str(sale["due"])))
    L.append("-" * width)
    L.append(c(footer if footer is not None
               else (business.get("receipt_footer") or "Thank you for shopping with us!")))
    return "\n".join(L)


def build_a4_html(*, business: dict, sale: dict, items: list[dict],
                  payments: list[dict], cashier: str = "") -> str:
    """A4 invoice data model as printable HTML (Qt print path renders this)."""
    rows = "".join(
        f"<tr><td>{it['name']}</td><td align='right'>{it['qty']}</td>"
        f"<td align='right'>{it['unit_price']}</td><td align='right'>{it['line_total']}</td></tr>"
        for it in items)
    pays = "".join(f"<tr><td>{p['method']}</td><td align='right'>{p['amount']}</td></tr>"
                   for p in payments)
    return f"""<html><body><h2>{business.get('name', 'Store')}</h2>
<p>{business.get('address', '')} | Tel: {business.get('phone', '')} | BIN: {business.get('bin_no', '')}</p>
<hr><p>Invoice: <b>{sale['invoice_no']}</b> | Date: {sale.get('created_at', '')} | Cashier: {cashier}</p>
<table width='100%' border='1' cellspacing='0' cellpadding='4'>
<tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>{rows}</table>
<p>Subtotal: {sale['subtotal']} | Discount: {sale.get('item_discount', 0)} + {sale.get('invoice_discount', 0)} + {sale.get('promotion_discount', 0)} | VAT: {sale.get('vat', 0)}</p>
<h3>Total: {sale['total']} | Paid: {sale.get('paid', 0)} | Due: {sale.get('due', 0)} | Change: {sale.get('change_amount', 0)}</h3>
<table border='0'>{pays}</table>
<p>{business.get('receipt_footer') or 'Thank you for shopping with us!'}</p></body></html>"""
