"""Customer/supplier ledgers, due collection, stock adjustments."""
from __future__ import annotations

import sqlite3
from decimal import Decimal

from app.domain.money import to_money
from app.services.audit_service import record


def create_customer(conn: sqlite3.Connection, name: str, phone: str = "", address: str = "",
                    credit_limit: Decimal = Decimal("0")) -> int:
    if not name.strip():
        raise ValueError("Customer name required")
    cur = conn.execute("INSERT INTO customers(name, phone, address, credit_limit) VALUES(?,?,?,?)",
                       (name.strip(), phone.strip() or None, address.strip(), str(to_money(credit_limit))))
    conn.commit()
    return int(cur.lastrowid)


def collect_due(conn: sqlite3.Connection, *, session, customer_id: int, amount: Decimal,
                method: str = "cash", note: str = "") -> None:
    amt = to_money(amount)
    if amt <= 0:
        raise ValueError("Amount must be positive")
    with conn:
        conn.execute("INSERT INTO customer_payments(customer_id, amount, method, note, user_id)"
                     " VALUES(?,?,?,?,?)", (customer_id, str(amt), method, note, session.user_id))
        conn.execute("UPDATE customers SET balance = CASE WHEN balance - ? < 0 THEN 0"
                     " ELSE balance - ? END WHERE id=?", (str(amt), str(amt), customer_id))
        record(conn, user_id=session.user_id, action="customer.due_collected", entity="customer",
               entity_id=str(customer_id), new_value=f"collected={amt} method={method}")


def create_supplier(conn: sqlite3.Connection, name: str, phone: str = "",
                    address: str = "") -> int:
    if not name.strip():
        raise ValueError("Supplier name required")
    cur = conn.execute("INSERT INTO suppliers(name, phone, address) VALUES(?,?,?)",
                       (name.strip(), phone.strip(), address.strip()))
    conn.commit()
    return int(cur.lastrowid)


def adjust_stock(conn: sqlite3.Connection, *, session, lines: list[dict], reason: str,
                 approved_by: int | None = None) -> int:
    """Ledger-based adjustment: never overwrites stock, always appends movements."""
    session.require("adjust_stock")
    if not reason.strip():
        raise ValueError("Adjustment reason required")
    sensitive = any(Decimal(str(l["qty_change"])) != 0 for l in lines)
    if sensitive and approved_by is None and not session.can("approve"):
        # Self-approval allowed only for approvers; others need manager id.
        raise PermissionError("Manager approval required for stock adjustment")
    with conn:
        cur = conn.execute("INSERT INTO stock_adjustments(reason, user_id, approved_by) VALUES(?,?,?)",
                           (reason.strip(), session.user_id, approved_by or session.user_id))
        aid = int(cur.lastrowid)
        for ln in lines:
            qc = Decimal(str(ln["qty_change"]))
            if qc == 0:
                continue
            conn.execute("INSERT INTO stock_adjustment_items(adjustment_id, product_id, qty_change)"
                         " VALUES(?,?,?)", (aid, ln["product_id"], str(qc)))
            row = conn.execute("SELECT id FROM inventory_batches WHERE product_id=? AND batch_no=''",
                               (ln["product_id"],)).fetchone()
            bid = row["id"] if row else conn.execute(
                "INSERT INTO inventory_batches(product_id, batch_no, qty, unit_cost) VALUES(?, '', 0, 0)",
                (ln["product_id"],)).lastrowid
            conn.execute("UPDATE inventory_batches SET qty = qty + ? WHERE id=?", (str(qc), bid))
            after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                                 (ln["product_id"],)).fetchone()["s"]
            conn.execute("INSERT INTO inventory_movements(product_id, batch_id, qty_change, qty_after,"
                         " source_type, source_id, reason, user_id) VALUES(?,?,?,?,?,?,?,?)",
                         (ln["product_id"], bid, str(qc), str(after), "adjustment", aid, reason,
                          session.user_id))
        record(conn, user_id=session.user_id, action="stock.adjusted", entity="adjustment",
               entity_id=str(aid), new_value=reason)
    return aid
