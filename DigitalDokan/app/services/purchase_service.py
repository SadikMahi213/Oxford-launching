"""Purchase receiving: atomic stock + supplier balance update."""
from __future__ import annotations

import sqlite3
from decimal import Decimal

from app.domain.money import to_money
from app.domain.invoices import next_po_no
from app.domain.units import convert_qty
from app.services import approval_service
from app.services.audit_service import record


def receive_purchase(conn: sqlite3.Connection, *, session, supplier_id: int | None,
                     items: list[dict], discount: Decimal = Decimal("0"),
                     paid: Decimal = Decimal("0"), note: str = "",
                     idempotency_key: str | None = None) -> dict:
    session.require("purchase.create")
    if idempotency_key:
        existing = conn.execute("SELECT id, invoice_no, total, due FROM purchases"
                                " WHERE idempotency_key=?", (idempotency_key,)).fetchone()
        if existing is not None:
            return {"purchase_id": int(existing["id"]), "invoice_no": existing["invoice_no"],
                    "total": Decimal(str(existing["total"])), "due": Decimal(str(existing["due"])),
                    "duplicate": True}
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
        inv = next_po_no(conn)
        cur = conn.execute(
            "INSERT INTO purchases(invoice_no, supplier_id, subtotal, discount, total, paid, due,"
            " user_id, note, idempotency_key)"
            " VALUES(?,?,?,?,?,?,?,?,?,?)",
            (inv, supplier_id, str(subtotal), str(disc), str(total), str(paid_m), str(due),
             session.user_id, note, idempotency_key))
        pid = int(cur.lastrowid)
        for it in items:
            qty = Decimal(str(it["qty"]))
            cost = to_money(it["cost"])
            # Unit conversion (§8): qty/cost may be quoted in the purchase unit;
            # stock, batches and ledger always use base (stock) units.
            prow = conn.execute("SELECT unit_id FROM products WHERE id=?",
                                (it["product_id"],)).fetchone()
            stock_unit = prow["unit_id"] if prow else None
            given_unit = it.get("unit_id")
            base_qty = convert_qty(conn, qty, given_unit, stock_unit)
            if base_qty <= 0:
                raise ValueError("Invalid purchase line")
            base_cost = to_money((cost * qty) / base_qty)
            batch_no = (it.get("batch_no") or "").strip()
            expiry = (it.get("expiry_date") or "").strip() or None
            conn.execute("INSERT INTO purchase_items(purchase_id, product_id, batch_no, expiry_date,"
                         " qty, cost, line_total, unit_id, unit_qty)"
                         " VALUES(?,?,?,?,?,?,?,?,?)",
                         (pid, it["product_id"], batch_no, expiry, str(base_qty), str(base_cost),
                          str(cost * qty), given_unit, str(qty)))
            row = conn.execute("SELECT id, qty FROM inventory_batches WHERE product_id=? AND batch_no=?",
                               (it["product_id"], batch_no)).fetchone()
            if row is None:
                cur2 = conn.execute("INSERT INTO inventory_batches(product_id, batch_no, expiry_date, qty, unit_cost)"
                                    " VALUES(?,?,?,?,?)",
                                    (it["product_id"], batch_no, expiry, str(base_qty), str(base_cost)))
                bid = int(cur2.lastrowid)
            else:
                bid = int(row["id"])
                conn.execute("UPDATE inventory_batches SET qty = qty + ?, unit_cost=? WHERE id=?",
                             (str(base_qty), str(base_cost), bid))
            after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                                 (it["product_id"],)).fetchone()["s"]
            conn.execute("INSERT INTO inventory_movements(product_id, batch_id, qty_change, qty_after,"
                         " source_type, source_id, user_id) VALUES(?,?,?,?,?,?,?)",
                         (it["product_id"], bid, str(base_qty), str(after), "purchase", pid,
                          session.user_id))
            conn.execute("INSERT OR IGNORE INTO product_suppliers(product_id, supplier_id, last_cost)"
                         " VALUES(?,?,?)", (it["product_id"], supplier_id, str(cost)))
            if supplier_id:
                conn.execute("UPDATE product_suppliers SET last_cost=? WHERE product_id=? AND supplier_id=?",
                             (str(cost), it["product_id"], supplier_id))
        if supplier_id:
            conn.execute("UPDATE suppliers SET balance = balance + ? WHERE id=?", (str(due), supplier_id))
        record(conn, user_id=session.user_id, action="purchase.received", entity="purchase",
               entity_id=inv, new_value=f"total={total} paid={paid_m}")
        from app.sync.outbox import enqueue as _enqueue
        _enqueue(conn, "purchase.received", {"purchase_id": pid, "invoice_no": inv,
                                             "total": str(total)})
        conn.commit()
        return {"purchase_id": pid, "invoice_no": inv, "total": total, "due": due}
    except Exception:
        conn.rollback()
        raise


def process_purchase_return(conn: sqlite3.Connection, *, session, purchase_id: int,
                              items: list[dict], reason: str = "", approver=None) -> dict:
    """Atomic purchase return: stock out (FEFO) + supplier payable down + line items. (§12)"""
    session.require("purchase.create")
    if not reason.strip():
        raise ValueError("Return reason required")
    conn.execute("BEGIN IMMEDIATE")
    try:
        purch = conn.execute("SELECT * FROM purchases WHERE id=?", (purchase_id,)).fetchone()
        if purch is None:
            raise ValueError("Purchase not found")
        # Remaining returnable qty per product.
        bought: dict[int, Decimal] = {}
        for r in conn.execute("SELECT product_id, SUM(qty) q FROM purchase_items"
                              " WHERE purchase_id=? GROUP BY product_id", (purchase_id,)):
            bought[int(r["product_id"])] = Decimal(str(r["q"]))
        for r in conn.execute("""SELECT i.product_id, SUM(i.qty) q FROM purchase_return_items i
                                 JOIN purchase_returns pr ON pr.id=i.return_id
                                 WHERE pr.purchase_id=? GROUP BY i.product_id""", (purchase_id,)):
            bought[int(r["product_id"])] = bought.get(int(r["product_id"]), Decimal("0")) - Decimal(str(r["q"]))
        estimate = Decimal("0.00")
        for it in items:
            pid = int(it["product_id"])
            qty = Decimal(str(it["qty"]))
            if qty <= 0 or qty > bought.get(pid, Decimal("0")):
                raise ValueError(f"Invalid return qty for product {pid}")
            prow = conn.execute("SELECT cost_price FROM products WHERE id=?", (pid,)).fetchone()
            estimate += to_money(prow["cost_price"]) * qty
        estimate = to_money(estimate)
        if estimate > approval_service.get_threshold(conn, "approval.purchase_return_above"):
            approval_service.authorize(conn, session=session, action="purchase.return",
                                       amount=estimate, entity="purchase",
                                       entity_id=str(purch["invoice_no"]), reason=reason,
                                       approver=approver)
        conn.execute("INSERT INTO purchase_returns(purchase_id, total, reason, user_id)"
                     " VALUES(?,?,?,?)", (purchase_id, "0", reason.strip(), session.user_id))
        rid = int(conn.execute("SELECT last_insert_rowid()").fetchone()[0])
        total = Decimal("0.00")
        for it in items:
            pid = int(it["product_id"])
            qty = Decimal(str(it["qty"]))
            cost = to_money(conn.execute("SELECT cost_price FROM products WHERE id=?",
                                         (pid,)).fetchone()["cost_price"])
            line = to_money(cost * qty)
            conn.execute("INSERT INTO purchase_return_items(return_id, product_id, qty, cost, line_total)"
                         " VALUES(?,?,?,?,?)", (rid, pid, str(qty), str(cost), str(line)))
            total += line
            # Consume FEFO (returns ship oldest stock first).
            need = qty
            for b in conn.execute(
                    """SELECT id, qty FROM inventory_batches WHERE product_id=? AND qty > 0
                       ORDER BY CASE WHEN expiry_date IS NULL OR expiry_date='' THEN 1 ELSE 0 END,
                                expiry_date ASC, id ASC""", (pid,)):
                if need <= 0:
                    break
                take = min(Decimal(str(b["qty"])), need)
                conn.execute("UPDATE inventory_batches SET qty = qty - ? WHERE id=?",
                             (str(take), b["id"]))
                after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches"
                                     " WHERE product_id=?", (pid,)).fetchone()["s"]
                conn.execute("INSERT INTO inventory_movements(product_id, batch_id, qty_change,"
                             " qty_after, source_type, source_id, reason, user_id)"
                             " VALUES(?,?,?,?,?,?,?,?)",
                             (pid, int(b["id"]), str(-take), str(after), "purchase_return", rid,
                              reason.strip(), session.user_id))
                need -= take
            if need > 0:
                raise ValueError("Insufficient stock for purchase return")
        total = to_money(total)
        conn.execute("UPDATE purchase_returns SET total=? WHERE id=?", (str(total), rid))
        if purch["supplier_id"]:
            conn.execute("UPDATE suppliers SET balance = balance - ? WHERE id=?",
                         (str(total), purch["supplier_id"]))
        record(conn, user_id=session.user_id, action="purchase.returned", entity="purchase",
               entity_id=str(purch["invoice_no"]), new_value=f"return_total={total} reason={reason}")
        conn.commit()
        return {"return_id": rid, "total": total}
    except Exception:
        conn.rollback()
        raise


def pay_supplier(conn: sqlite3.Connection, *, session, supplier_id: int, amount: Decimal,
                 method: str = "cash", note: str = "") -> None:
    session.require("supplier.payment")
    amt = to_money(amount)
    if amt <= 0:
        raise ValueError("Amount must be positive")
    with conn:
        conn.execute("INSERT INTO supplier_payments(supplier_id, amount, method, note, user_id)"
                     " VALUES(?,?,?,?,?)", (supplier_id, str(amt), method, note, session.user_id))
        # Straight subtraction; negative balance = supplier owes us (advance/credit).
        conn.execute("UPDATE suppliers SET balance = balance - ? WHERE id=?",
                     (str(amt), supplier_id))
        from app.sync.outbox import enqueue as _enqueue
        _enqueue(conn, "supplier.paid", {"supplier_id": supplier_id, "amount": str(amt),
                                         "method": method})
        record(conn, user_id=session.user_id, action="supplier.payment", entity="supplier",
               entity_id=str(supplier_id), new_value=f"paid={amt} method={method}")
