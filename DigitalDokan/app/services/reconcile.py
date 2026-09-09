"""Financial/inventory invariant verification (§34).

Every check recomputes expected state from transactional source rows and compares
against stored balances — the same rules the services enforce on write:

  Sale Total  = SUM(line_total) - invoice_discount - promotion_discount
  paid        = SUM(sale_payments); due/change derived
  Customer Due = SUM(completed sale dues) - collections - due-sale returns
  Supplier Payable = SUM(purchase dues) - payments - purchase returns
  Stock = SUM(movements) == SUM(batches)   (per product)
  Shift Cash = opening + cash sales + in - out - shift-scoped cash expenses

verify_database() aggregates all checks + integrity for diagnostics, migration
validation and release QA. Returns a list of human-readable issue strings
(empty = reconciled).
"""
from __future__ import annotations

import sqlite3
from decimal import Decimal

from app.domain.money import to_money
from app.infra import db as dbmod


def check_sale(conn: sqlite3.Connection, sale_id: int) -> list[str]:
    issues = []
    s = conn.execute("SELECT * FROM sales WHERE id=?", (sale_id,)).fetchone()
    if s is None:
        return [f"sale {sale_id}: missing"]
    items = conn.execute("SELECT * FROM sale_items WHERE sale_id=?", (sale_id,)).fetchall()
    pays = conn.execute("SELECT * FROM sale_payments WHERE sale_id=?", (sale_id,)).fetchall()
    if not items:
        issues.append(f"sale {s['invoice_no']}: no line items")
    line_sum = sum((to_money(r["line_total"]) for r in items), Decimal("0.00"))
    expected_total = to_money(line_sum - to_money(s["invoice_discount"])
                              - to_money(s["promotion_discount"]))
    if expected_total != to_money(s["total"]):
        issues.append(f"sale {s['invoice_no']}: total {s['total']} != items {line_sum}"
                      f" - inv_disc {s['invoice_discount']} - promo {s['promotion_discount']}")
    paid = sum((to_money(r["amount"]) for r in pays), Decimal("0.00"))
    if paid != to_money(s["paid"]):
        issues.append(f"sale {s['invoice_no']}: paid {s['paid']} != payments sum {paid}")
    total, paid_m = to_money(s["total"]), to_money(s["paid"])
    exp_due = to_money(total - paid_m) if paid_m < total else Decimal("0.00")
    exp_chg = to_money(paid_m - total) if paid_m > total else Decimal("0.00")
    if to_money(s["due"]) != exp_due:
        issues.append(f"sale {s['invoice_no']}: due {s['due']} != expected {exp_due}")
    if to_money(s["change_amount"]) != exp_chg:
        issues.append(f"sale {s['invoice_no']}: change {s['change_amount']} != expected {exp_chg}")
    return issues


def check_customer(conn: sqlite3.Connection, customer_id: int) -> list[str]:
    c = conn.execute("SELECT * FROM customers WHERE id=?", (customer_id,)).fetchone()
    if c is None:
        return [f"customer {customer_id}: missing"]
    dues = conn.execute("SELECT id, due FROM sales WHERE customer_id=? AND status='completed'",
                        (customer_id,)).fetchall()
    expected = sum((to_money(r["due"]) for r in dues), Decimal("0.00"))
    collected = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM customer_payments WHERE customer_id=?",
                             (customer_id,)).fetchone()["s"]
    expected -= to_money(collected)
    ret = conn.execute("""SELECT IFNULL(SUM(i.line_total),0) s FROM sale_return_items i
                          JOIN sale_returns r ON r.id=i.return_id
                          JOIN sales s ON s.id=r.sale_id
                          WHERE s.customer_id=? AND s.due > 0 AND s.status='completed'""",
                       (customer_id,)).fetchone()["s"]
    expected -= to_money(ret)
    if to_money(c["balance"]) != to_money(expected):
        return [f"customer {c['name']}: balance {c['balance']} != recomputed {expected}"]
    return []


def check_supplier(conn: sqlite3.Connection, supplier_id: int) -> list[str]:
    s = conn.execute("SELECT * FROM suppliers WHERE id=?", (supplier_id,)).fetchone()
    if s is None:
        return [f"supplier {supplier_id}: missing"]
    dues = conn.execute("SELECT IFNULL(SUM(due),0) s FROM purchases WHERE supplier_id=?",
                        (supplier_id,)).fetchone()["s"]
    paid = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM supplier_payments WHERE supplier_id=?",
                        (supplier_id,)).fetchone()["s"]
    rets = conn.execute("""SELECT IFNULL(SUM(i.line_total),0) s FROM purchase_return_items i
                           JOIN purchase_returns r ON r.id=i.return_id
                           JOIN purchases p ON p.id=r.purchase_id
                           WHERE p.supplier_id=?""", (supplier_id,)).fetchone()["s"]
    expected = to_money(dues) - to_money(paid) - to_money(rets)
    if to_money(s["balance"]) != expected:
        return [f"supplier {s['name']}: balance {s['balance']} != recomputed {expected}"]
    return []


def check_stock(conn: sqlite3.Connection, product_id: int | None = None) -> list[str]:
    issues = []
    q = "SELECT id FROM products" + (" WHERE id=?" if product_id is not None else "")
    params = (product_id,) if product_id is not None else ()
    for r in conn.execute(q, params):
        pid = int(r["id"])
        mov = conn.execute("SELECT IFNULL(SUM(qty_change),0) s FROM inventory_movements"
                           " WHERE product_id=?", (pid,)).fetchone()["s"]
        bat = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                           (pid,)).fetchone()["s"]
        if Decimal(str(mov)) != Decimal(str(bat)):
            issues.append(f"product {pid}: movements sum {mov} != batches sum {bat}")
    return issues


def check_shift(conn: sqlite3.Connection, shift_id: int) -> list[str]:
    sh = conn.execute("SELECT * FROM cash_sessions WHERE id=?", (shift_id,)).fetchone()
    if sh is None:
        return [f"shift {shift_id}: missing"]
    if sh["status"] != "closed" or sh["expected_cash"] is None:
        return []
    cash_sales = conn.execute(
        "SELECT IFNULL(SUM(sp.amount),0) s FROM sale_payments sp JOIN sales s ON s.id=sp.sale_id"
        " WHERE s.shift_id=? AND s.status='completed' AND sp.method='cash'",
        (shift_id,)).fetchone()["s"]
    io_in = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM cash_movements WHERE shift_id=?"
                         " AND direction='in'", (shift_id,)).fetchone()["s"]
    io_out = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM cash_movements WHERE shift_id=?"
                          " AND direction='out'", (shift_id,)).fetchone()["s"]
    exp_cash = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM expenses"
                            " WHERE method='cash' AND shift_id=?", (shift_id,)).fetchone()["s"]
    expected = (to_money(sh["opening_cash"]) + to_money(cash_sales) + to_money(io_in)
                - to_money(io_out) - to_money(exp_cash))
    if to_money(sh["expected_cash"]) != expected:
        return [f"shift {shift_id}: stored expected {sh['expected_cash']} != recomputed {expected}"]
    return []


def verify_database(conn: sqlite3.Connection, full_stock: bool = True) -> list[str]:
    issues: list[str] = []
    if dbmod.integrity_check(conn) != "ok":
        issues.append("integrity_check failed")
    for r in conn.execute("SELECT id FROM sales"):
        issues.extend(check_sale(conn, int(r["id"])))
    for r in conn.execute("SELECT id FROM customers"):
        issues.extend(check_customer(conn, int(r["id"])))
    for r in conn.execute("SELECT id FROM suppliers"):
        issues.extend(check_supplier(conn, int(r["id"])))
    for r in conn.execute("SELECT id FROM cash_sessions"):
        issues.extend(check_shift(conn, int(r["id"])))
    if full_stock:
        issues.extend(check_stock(conn))
    return issues
