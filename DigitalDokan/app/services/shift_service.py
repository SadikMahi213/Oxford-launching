"""Shift open/close with payment-method reconciliation + expenses."""
from __future__ import annotations

import sqlite3
from decimal import Decimal

from app.domain.money import to_money
from app.services.audit_service import record


def open_shift(conn: sqlite3.Connection, *, session, terminal_code: str = "POS-01",
               opening_cash: Decimal = Decimal("0")) -> int:
    existing = conn.execute(
        "SELECT id FROM cash_sessions WHERE user_id=? AND status='open'", (session.user_id,)).fetchone()
    if existing:
        return int(existing["id"])
    term = conn.execute("SELECT id FROM terminals WHERE code=?", (terminal_code,)).fetchone()
    cur = conn.execute("INSERT INTO cash_sessions(terminal_id, user_id, opening_cash) VALUES(?,?,?)",
                       (term["id"] if term else None, session.user_id, str(to_money(opening_cash))))
    conn.commit()
    return int(cur.lastrowid)


def cash_io(conn: sqlite3.Connection, *, session, shift_id: int, direction: str,
            amount: Decimal, reason: str = "") -> None:
    if direction not in ("in", "out"):
        raise ValueError("direction must be in/out")
    amt = to_money(amount)
    with conn:
        conn.execute("INSERT INTO cash_movements(shift_id, direction, amount, reason, user_id)"
                     " VALUES(?,?,?,?,?)", (shift_id, direction, str(amt), reason, session.user_id))


def add_expense(conn: sqlite3.Connection, *, session, category_id: int, amount: Decimal,
                method: str = "cash", note: str = "") -> int:
    amt = to_money(amount)
    if amt <= 0:
        raise ValueError("Amount must be positive")
    cur = conn.execute("INSERT INTO expenses(category_id, amount, method, note, user_id)"
                       " VALUES(?,?,?,?,?)", (category_id, str(amt), method, note, session.user_id))
    conn.commit()
    record(conn, user_id=session.user_id, action="expense.added", entity="expense",
           entity_id=str(cur.lastrowid), new_value=f"{amt} {note}")
    return int(cur.lastrowid)


def close_shift(conn: sqlite3.Connection, *, session, shift_id: int,
                actual_cash: Decimal) -> dict:
    conn.execute("BEGIN IMMEDIATE")
    try:
        shift = conn.execute("SELECT * FROM cash_sessions WHERE id=?", (shift_id,)).fetchone()
        if shift is None or shift["status"] == "closed":
            raise ValueError("Shift not open")
        by_method = {r["method"]: Decimal(str(r["t"])) for r in conn.execute(
            "SELECT method, SUM(amount) t FROM sale_payments sp JOIN sales s ON s.id=sp.sale_id"
            " WHERE s.shift_id=? AND s.status='completed' GROUP BY method", (shift_id,))}
        cash_sales = by_method.get("cash", Decimal("0"))
        io_in = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM cash_movements WHERE shift_id=?"
                             " AND direction='in'", (shift_id,)).fetchone()["s"]
        io_out = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM cash_movements WHERE shift_id=?"
                              " AND direction='out'", (shift_id,)).fetchone()["s"]
        exp_cash = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM expenses WHERE method='cash'").fetchone()["s"]
        expected = (Decimal(str(shift["opening_cash"])) + Decimal(str(cash_sales))
                    + Decimal(str(io_in)) - Decimal(str(io_out)) - Decimal(str(exp_cash)))
        actual = to_money(actual_cash)
        diff = to_money(actual - expected)
        conn.execute("UPDATE cash_sessions SET expected_cash=?, actual_cash=?, difference=?,"
                     " status='closed', closed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
                     (str(to_money(expected)), str(actual), str(diff), shift_id))
        record(conn, user_id=session.user_id, action="shift.closed", entity="shift",
               entity_id=str(shift_id), new_value=f"expected={expected} actual={actual} diff={diff}")
        conn.commit()
        return {"expected": to_money(expected), "actual": actual, "difference": diff,
                "by_method": {k: str(v) for k, v in by_method.items()}}
    except Exception:
        conn.rollback()
        raise
