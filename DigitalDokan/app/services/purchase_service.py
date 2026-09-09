"""Purchase receiving: atomic stock + supplier balance update."""
from __future__ import annotations

import sqlite3
from decimal import Decimal

from app.domain.money import to_money
from app.services.audit_service import record


def receive_purchase(conn: sqlite3.Connection, *, session, supplier_id: int | None,
                     items: list[dict], discount: Decimal = Decimal("0"),
                     paid: Decimal = Decimal("0"), note: str = "") -> dict:
    conn.execute("BEGIN IMMEDIATE")
    try:
        subtotal = Decimal("0.00")
        for it in items:
            qty = Decimal(str(it["qty"]))
            cost = to_money(it["cost"])
            if qty <= 0 or cost < 0:
                raise ValueError("Invalid purchase line")
            subtotal += cost * qty
        subtotal = to_money(subtotal)
        disc = to_money(discount)
        total = to_money(subtotal - disc)
        paid_m = to_money(paid)
        if paid_m > total:
            raise ValueError("Paid exceeds purchase total")
        due = to_money(total - paid_m)
        n = conn.execute("SELECT IFNULL(MAX(id),0)+1 n FROM purchases").fetchone()["n"]
        import datetime
        inv = f"PO-{datetime.datetime.now():%Y}-{int(n):06d}"
        cur = conn.execute(
            "INSERT INTO purchases(invoice_no, supplier_id, subtotal, discount, total, paid, due, user_id, note)"
            " VALUES(?,?,?,?,?,?,?,?,?)",
            (inv, supplier_id, str(subtotal), str(disc), str(total), str(paid_m), str(due),
             session.user_id, note))
        pid = int(cur.lastrowid)
        for it in items:
            qty = Decimal(str(it["qty"]))
            cost = to_money(it["cost"])
            batch_no = (it.get("batch_no") or "").strip()
            expiry = (it.get("expiry_date") or "").strip() or None
            conn.execute("INSERT INTO purchase_items(purchase_id, product_id, batch_no, expiry_date, qty, cost, line_total)"
                         " VALUES(?,?,?,?,?,?,?)",
                         (pid, it["product_id"], batch_no, expiry, str(qty), str(cost), str(cost * qty)))
            row = conn.execute("SELECT id, qty FROM inventory_batches WHERE product_id=? AND batch_no=?",
                               (it["product_id"], batch_no)).fetchone()
            if row is None:
                cur2 = conn.execute("INSERT INTO inventory_batches(product_id, batch_no, expiry_date, qty, unit_cost)"
                                    " VALUES(?,?,?,?,?)",
                                    (it["product_id"], batch_no, expiry, str(qty), str(cost)))
                bid = int(cur2.lastrowid)
            else:
                bid = int(row["id"])
                conn.execute("UPDATE inventory_batches SET qty = qty + ?, unit_cost=? WHERE id=?",
                             (str(qty), str(cost), bid))
            after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                                 (it["product_id"],)).fetchone()["s"]
            conn.execute("INSERT INTO inventory_movements(product_id, batch_id, qty_change, qty_after,"
                         " source_type, source_id, user_id) VALUES(?,?,?,?,?,?,?)",
                         (it["product_id"], bid, str(qty), str(after), "purchase", pid, session.user_id))
            conn.execute("INSERT OR IGNORE INTO product_suppliers(product_id, supplier_id, last_cost)"
                         " VALUES(?,?,?)", (it["product_id"], supplier_id, str(cost)))
            if supplier_id:
                conn.execute("UPDATE product_suppliers SET last_cost=? WHERE product_id=? AND supplier_id=?",
                             (str(cost), it["product_id"], supplier_id))
        if supplier_id:
            conn.execute("UPDATE suppliers SET balance = balance + ? WHERE id=?", (str(due), supplier_id))
        record(conn, user_id=session.user_id, action="purchase.received", entity="purchase",
               entity_id=inv, new_value=f"total={total} paid={paid_m}")
        conn.commit()
        return {"purchase_id": pid, "invoice_no": inv, "total": total, "due": due}
    except Exception:
        conn.rollback()
        raise


def pay_supplier(conn: sqlite3.Connection, *, session, supplier_id: int, amount: Decimal,
                 method: str = "cash", note: str = "") -> None:
    amt = to_money(amount)
    if amt <= 0:
        raise ValueError("Amount must be positive")
    with conn:
        conn.execute("INSERT INTO supplier_payments(supplier_id, amount, method, note, user_id)"
                     " VALUES(?,?,?,?,?)", (supplier_id, str(amt), method, note, session.user_id))
        conn.execute("UPDATE suppliers SET balance = CASE WHEN balance - ? < 0 THEN 0"
                     " ELSE balance - ? END WHERE id=?", (str(amt), str(amt), supplier_id))
        record(conn, user_id=session.user_id, action="supplier.payment", entity="supplier",
               entity_id=str(supplier_id), new_value=f"paid={amt} method={method}")
