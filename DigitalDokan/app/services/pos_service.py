"""Atomic POS sale: CompleteSale / ProcessReturn / CancelInvoice / Hold-Resume."""
from __future__ import annotations

import json
import sqlite3
from decimal import Decimal

from app.domain.invoices import next_invoice_no
from app.domain.money import to_money
from app.domain.pricing import CartLine, compute_totals
from app.services.audit_service import record

PAYMENT_METHODS = {"cash", "card", "bkash", "nagad", "rocket", "bank", "due", "other"}


def _consume_stock(conn: sqlite3.Connection, product_id: int, qty: Decimal, source_type: str,
                   source_id: int, user_id: int | None, allow_negative: bool) -> None:
    need = qty
    batches = conn.execute(
        """SELECT id, qty FROM inventory_batches WHERE product_id=?
           ORDER BY CASE WHEN expiry_date IS NULL OR expiry_date='' THEN 1 ELSE 0 END,
                    expiry_date ASC, id ASC""", (product_id,)).fetchall()
    for b in batches:
        if need <= 0:
            break
        avail = Decimal(str(b["qty"]))
        take = min(avail, need)
        if take > 0:
            newq = avail - take
            conn.execute("UPDATE inventory_batches SET qty=? WHERE id=?", (str(newq), b["id"]))
            after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                                 (product_id,)).fetchone()["s"]
            conn.execute(
                "INSERT INTO inventory_movements(product_id, batch_id, qty_change, qty_after,"
                " source_type, source_id, user_id) VALUES(?,?,?,?,?,?,?)",
                (product_id, b["id"], str(-take), str(after), source_type, source_id, user_id))
            need -= take
    if need > 0:
        if not allow_negative:
            raise ValueError("Insufficient stock")
        # Negative-stock mode: book deficit on default batch.
        row = conn.execute("SELECT id FROM inventory_batches WHERE product_id=? AND batch_no=''",
                           (product_id,)).fetchone()
        if row is None:
            cur = conn.execute(
                "INSERT INTO inventory_batches(product_id, batch_no, qty, unit_cost) VALUES(?, '', 0, 0)",
                (product_id,))
            bid = cur.lastrowid
        else:
            bid = row["id"]
        conn.execute("UPDATE inventory_batches SET qty = qty - ? WHERE id=?", (str(need), bid))
        after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                             (product_id,)).fetchone()["s"]
        conn.execute(
            "INSERT INTO inventory_movements(product_id, batch_id, qty_change, qty_after,"
            " source_type, source_id, reason, user_id) VALUES(?,?,?,?,?,?,?,?)",
            (product_id, bid, str(-need), str(after), source_type, source_id,
             "negative-stock-allowed", user_id))


def complete_sale(conn: sqlite3.Connection, *, session, items: list[dict],
                  payments: list[dict], customer_id: int | None = None,
                  invoice_discount: Decimal = Decimal("0"), terminal_code: str = "POS-01",
                  shift_id: int | None = None, allow_negative_stock: bool = False) -> dict:
    """Atomic sale. Printing happens OUTSIDE (caller) so printer failure never rolls back sale."""
    session.require("sell")
    if not items:
        raise ValueError("Cart is empty")
    for p in payments:
        if p["method"] not in PAYMENT_METHODS:
            raise ValueError(f"Unknown payment method: {p['method']}")
        if Decimal(str(p["amount"])) < 0:
            raise ValueError("Payment amount cannot be negative")
    if invoice_discount and not session.can("give_discount"):
        raise PermissionError("Permission denied: give_discount")

    conn.execute("BEGIN IMMEDIATE")
    try:
        lines: list[CartLine] = []
        for it in items:
            prod = conn.execute("SELECT * FROM products WHERE id=? AND is_active=1",
                                (it["product_id"],)).fetchone()
            if prod is None:
                raise ValueError(f"Invalid/inactive product id {it['product_id']}")
            qty = Decimal(str(it["qty"]))
            if qty <= 0:
                raise ValueError("Quantity must be positive")
            price = Decimal(str(it.get("unit_price", prod["sell_price"])))
            if price != Decimal(str(prod["sell_price"])) and not session.can("change_price"):
                raise PermissionError("Permission denied: change_price")
            disc = Decimal(str(it.get("discount_pct", 0)))
            if disc > 0 and not session.can("give_discount"):
                raise PermissionError("Permission denied: give_discount")
            lines.append(CartLine(int(prod["id"]), prod["name"], qty, to_money(price),
                                  to_money(disc), to_money(prod["vat_pct"])))
        paid_total = sum((to_money(p["amount"]) for p in payments), Decimal("0.00"))
        totals = compute_totals(lines, invoice_discount=to_money(invoice_discount), paid=paid_total)
        # Due requires a customer (credit accountability).
        due_methods = [p for p in payments if p["method"] == "due"]
        if totals.due > 0 and customer_id is None and not due_methods:
            # Unpaid remainder without explicit due method still needs customer.
            pass
        if (totals.due > 0 or due_methods) and customer_id is None:
            raise ValueError("Customer required for due sale")
        if customer_id is not None:
            cust = conn.execute("SELECT * FROM customers WHERE id=?", (customer_id,)).fetchone()
            if cust is None:
                raise ValueError("Invalid customer")
            limit = Decimal(str(cust["credit_limit"]))
            bal = Decimal(str(cust["balance"]))
            if limit > 0 and bal + totals.due > limit:
                raise ValueError("Customer credit limit exceeded")

        invoice_no = next_invoice_no(conn)
        term = conn.execute("SELECT id FROM terminals WHERE code=?", (terminal_code,)).fetchone()
        tid = term["id"] if term else None
        cur = conn.execute(
            """INSERT INTO sales(invoice_no, terminal_id, customer_id, user_id, subtotal, item_discount,
               invoice_discount, vat, rounding, total, paid, due, change_amount, shift_id)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (invoice_no, tid, customer_id, session.user_id, str(totals.subtotal),
             str(totals.item_discount), str(totals.invoice_discount), str(totals.vat_total),
             str(totals.rounding), str(totals.grand_total), str(totals.paid),
             str(totals.due), str(totals.change), shift_id))
        sale_id = int(cur.lastrowid)
        for ln in lines:
            gross = ln.line_gross()
            net = ln.line_net()
            conn.execute(
                """INSERT INTO sale_items(sale_id, product_id, qty, unit_price, discount_pct, vat_pct, line_total)
                   VALUES(?,?,?,?,?,?,?)""",
                (sale_id, ln.product_id, str(ln.qty), str(ln.unit_price),
                 str(ln.discount_pct), str(ln.vat_pct), str(net + ln.line_vat())))
            _consume_stock(conn, ln.product_id, ln.qty, "sale", sale_id,
                           session.user_id, allow_negative_stock)
        for p in payments:
            conn.execute("INSERT INTO sale_payments(sale_id, method, amount, reference) VALUES(?,?,?,?)",
                         (sale_id, p["method"], str(to_money(p["amount"])), p.get("reference", "")))
        if customer_id is not None and totals.due > 0:
            conn.execute("UPDATE customers SET balance = balance + ? WHERE id=?",
                         (str(totals.due), customer_id))
        if customer_id is not None:
            pts = int(totals.grand_total // Decimal("100"))
            if pts > 0:
                conn.execute("UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id=?",
                             (pts, customer_id))
                conn.execute("INSERT INTO loyalty_transactions(customer_id, points, source_type, source_id)"
                             " VALUES(?,?,?,?)", (customer_id, pts, "sale", sale_id))
        record(conn, user_id=session.user_id, action="sale.completed", entity="sale",
               entity_id=invoice_no, new_value=f"total={totals.grand_total} paid={totals.paid}",
               terminal_code=terminal_code)
        conn.commit()
        return {"sale_id": sale_id, "invoice_no": invoice_no, "totals": totals}
    except Exception:
        conn.rollback()
        raise


def process_return(conn: sqlite3.Connection, *, session, sale_id: int, items: list[dict],
                   reason: str = "") -> dict:
    session.require("refund")
    conn.execute("BEGIN IMMEDIATE")
    try:
        sale = conn.execute("SELECT * FROM sales WHERE id=?", (sale_id,)).fetchone()
        if sale is None or sale["status"] == "cancelled":
            raise ValueError("Sale not eligible for return")
        total = Decimal("0.00")
        conn.execute("INSERT INTO sale_returns(sale_id, total, reason, user_id) VALUES(?,?,?,?)",
                     (sale_id, "0", reason, session.user_id))
        rid = int(conn.execute("SELECT last_insert_rowid()").fetchone()[0])
        for it in items:
            sitem = conn.execute("SELECT * FROM sale_items WHERE sale_id=? AND product_id=?",
                                 (sale_id, it["product_id"])).fetchone()
            if sitem is None:
                raise ValueError("Item not in original sale")
            qty = Decimal(str(it["qty"]))
            if qty <= 0 or qty > Decimal(str(sitem["qty"])):
                raise ValueError("Invalid return quantity")
            line = to_money(Decimal(str(sitem["unit_price"])) * qty)
            conn.execute("INSERT INTO sale_return_items(return_id, product_id, qty, unit_price, line_total)"
                         " VALUES(?,?,?,?,?)", (rid, it["product_id"], str(qty),
                                                str(sitem["unit_price"]), str(line)))
            total += line
            # Restock to default batch + ledger entry.
            row = conn.execute("SELECT id FROM inventory_batches WHERE product_id=? AND batch_no=''",
                               (it["product_id"],)).fetchone()
            bid = row["id"] if row else conn.execute(
                "INSERT INTO inventory_batches(product_id, batch_no, qty, unit_cost) VALUES(?, '', 0, 0)",
                (it["product_id"],)).lastrowid
            conn.execute("UPDATE inventory_batches SET qty = qty + ? WHERE id=?", (str(qty), bid))
            after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                                 (it["product_id"],)).fetchone()["s"]
            conn.execute("INSERT INTO inventory_movements(product_id, batch_id, qty_change, qty_after,"
                         " source_type, source_id, reason, user_id) VALUES(?,?,?,?,?,?,?,?)",
                         (it["product_id"], bid, str(qty), str(after), "sale_return", rid, reason,
                          session.user_id))
        conn.execute("UPDATE sale_returns SET total=? WHERE id=?", (str(total), rid))
        if sale["customer_id"] and Decimal(str(sale["due"])) > 0:
            conn.execute("UPDATE customers SET balance = CASE WHEN balance - ? < 0 THEN 0"
                         " ELSE balance - ? END WHERE id=?", (str(total), str(total), sale["customer_id"]))
        record(conn, user_id=session.user_id, action="sale.return", entity="sale",
               entity_id=str(sale["invoice_no"]), new_value=f"return_total={total} reason={reason}")
        conn.commit()
        return {"return_id": rid, "total": total}
    except Exception:
        conn.rollback()
        raise


def cancel_invoice(conn: sqlite3.Connection, *, session, sale_id: int, reason: str) -> None:
    session.require("cancel_invoice")
    if not reason.strip():
        raise ValueError("Cancellation reason required")
    conn.execute("BEGIN IMMEDIATE")
    try:
        sale = conn.execute("SELECT * FROM sales WHERE id=?", (sale_id,)).fetchone()
        if sale is None or sale["status"] == "cancelled":
            raise ValueError("Sale cannot be cancelled")
        # Reversal workflow: restock all items, reverse customer balance. Record never deleted.
        for sitem in conn.execute("SELECT * FROM sale_items WHERE sale_id=?", (sale_id,)):
            qty = Decimal(str(sitem["qty"]))
            row = conn.execute("SELECT id FROM inventory_batches WHERE product_id=? AND batch_no=''",
                               (sitem["product_id"],)).fetchone()
            bid = row["id"] if row else conn.execute(
                "INSERT INTO inventory_batches(product_id, batch_no, qty, unit_cost) VALUES(?, '', 0, 0)",
                (sitem["product_id"],)).lastrowid
            conn.execute("UPDATE inventory_batches SET qty = qty + ? WHERE id=?", (str(qty), bid))
            after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                                 (sitem["product_id"],)).fetchone()["s"]
            conn.execute("INSERT INTO inventory_movements(product_id, batch_id, qty_change, qty_after,"
                         " source_type, source_id, reason, user_id) VALUES(?,?,?,?,?,?,?,?)",
                         (sitem["product_id"], bid, str(qty), str(after), "sale_cancel", sale_id,
                          reason, session.user_id))
        if sale["customer_id"] and Decimal(str(sale["due"])) > 0:
            conn.execute("UPDATE customers SET balance = CASE WHEN balance - ? < 0 THEN 0"
                         " ELSE balance - ? END WHERE id=?",
                         (str(sale["due"]), str(sale["due"]), sale["customer_id"]))
        conn.execute("UPDATE sales SET status='cancelled', cancel_reason=?, cancelled_by=? WHERE id=?",
                     (reason, session.user_id, sale_id))
        record(conn, user_id=session.user_id, action="sale.cancelled", entity="sale",
               entity_id=str(sale["invoice_no"]), old_value="completed", new_value="cancelled",
               reason=reason)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def hold_sale(conn: sqlite3.Connection, *, session, cart: dict, note: str = "") -> int:
    cur = conn.execute("INSERT INTO held_sales(payload, note, user_id) VALUES(?,?,?)",
                       (json.dumps(cart, default=str), note, session.user_id))
    conn.commit()
    return int(cur.lastrowid)


def list_held(conn: sqlite3.Connection) -> list[dict]:
    return [dict(r) for r in conn.execute("SELECT * FROM held_sales ORDER BY id DESC LIMIT 50").fetchall()]


def resume_held(conn: sqlite3.Connection, hold_id: int) -> dict:
    row = conn.execute("SELECT * FROM held_sales WHERE id=?", (hold_id,)).fetchone()
    if row is None:
        raise ValueError("Held sale not found")
    cart = json.loads(row["payload"])
    conn.execute("DELETE FROM held_sales WHERE id=?", (hold_id,))
    conn.commit()
    return cart
