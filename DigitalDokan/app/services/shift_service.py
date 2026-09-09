"""Shift open/close with payment-method reconciliation + expenses."""
from __future__ import annotations

import sqlite3
from decimal import Decimal

from app.domain.money import to_money
from app.services.audit_service import record


def open_shift(conn: sqlite3.Connection, *, session, terminal_code: str = "POS-01",
               opening_cash: Decimal = Decimal("0")) -> int:
    session.require("shift.manage")
    term = conn.execute("SELECT id FROM terminals WHERE code=?", (terminal_code,)).fetchone()
    tid = term["id"] if term else None
    existing = conn.execute(
        "SELECT id FROM cash_sessions WHERE user_id=? AND status IN ('open','active','closing')"
        " AND ((terminal_id IS ? AND ? IS NULL) OR terminal_id IS ?)",
        (session.user_id, tid, tid, tid)).fetchone()
    if existing:
        return int(existing["id"])
    try:
        cur = conn.execute("INSERT INTO cash_sessions(terminal_id, user_id, opening_cash)"
                           " VALUES(?,?,?)", (tid, session.user_id, str(to_money(opening_cash))))
        conn.commit()
    except sqlite3.IntegrityError:
        # Lost a same-user/terminal open race; return the winner's shift.
        conn.rollback()
        existing = conn.execute(
            "SELECT id FROM cash_sessions WHERE user_id=? AND status IN ('open','active','closing')"
            " AND ((terminal_id IS ? AND ? IS NULL) OR terminal_id IS ?)",
            (session.user_id, tid, tid, tid)).fetchone()
        if existing is None:
            raise
        return int(existing["id"])
    return int(cur.lastrowid)


def cash_io(conn: sqlite3.Connection, *, session, shift_id: int, direction: str,
            amount: Decimal, reason: str = "") -> None:
    session.require("shift.manage")
    if direction not in ("in", "out"):
        raise ValueError("direction must be in/out")
    sh = conn.execute("SELECT status FROM cash_sessions WHERE id=?", (shift_id,)).fetchone()
    if sh is None:
        raise ValueError("Shift not found")
    if sh["status"] == "closed":
        raise ValueError("Shift is closed - corrections need shift.correct approval")
    amt = to_money(amount)
    with conn:
        conn.execute("INSERT INTO cash_movements(shift_id, direction, amount, reason, user_id)"
                     " VALUES(?,?,?,?,?)", (shift_id, direction, str(amt), reason, session.user_id))


def add_expense(conn: sqlite3.Connection, *, session, category_id: int, amount: Decimal,
                method: str = "cash", note: str = "", shift_id: int | None = None) -> int:
    session.require("expense.create")
    amt = to_money(amount)
    if amt <= 0:
        raise ValueError("Amount must be positive")
    if shift_id is not None:
        sh = conn.execute("SELECT status FROM cash_sessions WHERE id=?", (shift_id,)).fetchone()
        if sh is None:
            raise ValueError("Shift not found")
        if sh["status"] == "closed":
            raise ValueError("Shift is closed - corrections need shift.correct approval")
    cur = conn.execute("INSERT INTO expenses(category_id, amount, method, note, user_id, shift_id)"
                       " VALUES(?,?,?,?,?,?)",
                       (category_id, str(amt), method, note, session.user_id, shift_id))
    conn.commit()
    record(conn, user_id=session.user_id, action="expense.added", entity="expense",
           entity_id=str(cur.lastrowid), new_value=f"{amt} {note}")
    return int(cur.lastrowid)


def set_shift_state(conn: sqlite3.Connection, *, session, shift_id: int,
                    state: str) -> None:
    """Explicit lifecycle step OPEN→ACTIVE→CLOSING→CLOSED (§13). Closed is terminal
    except via reopen_shift (shift.correct + approval + audit)."""
    session.require("shift.manage")
    allowed = {"open": ("active",), "active": ("closing", "open"), "closing": ("closed", "active")}
    with conn:
        sh = conn.execute("SELECT status FROM cash_sessions WHERE id=?", (shift_id,)).fetchone()
        if sh is None:
            raise ValueError("Shift not found")
        cur = sh["status"]
        if cur == "closed" or state not in allowed.get(cur, ()):
            raise ValueError(f"Illegal shift transition {cur} → {state}")
        conn.execute("UPDATE cash_sessions SET status=? WHERE id=?", (state, shift_id))
        record(conn, user_id=session.user_id, action="shift.state", entity="shift",
               entity_id=str(shift_id), old_value=cur, new_value=state)


def reopen_shift(conn: sqlite3.Connection, *, session, shift_id: int, reason: str,
                 approver=None) -> None:
    """Correction workflow: closed → closing for recount, fully audited. (§13)"""
    session.require("shift.correct")
    if not reason.strip():
        raise ValueError("Correction reason required")
    from app.services import approval_service
    approval_service.authorize(conn, session=session, action="shift.correct",
                               entity="shift", entity_id=str(shift_id), reason=reason.strip(),
                               approver=approver)
    with conn:
        sh = conn.execute("SELECT status FROM cash_sessions WHERE id=?", (shift_id,)).fetchone()
        if sh is None or sh["status"] != "closed":
            raise ValueError("Only closed shifts can be reopened")
        conn.execute("UPDATE cash_sessions SET status='closing' WHERE id=?", (shift_id,))
        record(conn, user_id=session.user_id, action="shift.reopened", entity="shift",
               entity_id=str(shift_id), old_value="closed", new_value="closing", reason=reason.strip())


def close_shift(conn: sqlite3.Connection, *, session, shift_id: int,
                actual_cash: Decimal) -> dict:
    session.require("shift.close")
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
        # Shift-scoped cash expenses only (R1 global sum double-counted history).
        exp_cash = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM expenses"
                                " WHERE method='cash' AND shift_id=?", (shift_id,)).fetchone()["s"]
        legacy = conn.execute("SELECT COUNT(*) c FROM expenses WHERE method='cash'"
                              " AND shift_id IS NULL").fetchone()["c"]
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
                "by_method": {k: str(v) for k, v in by_method.items()},
                "legacy_unscoped_cash_expenses": int(legacy)}
    except Exception:
        conn.rollback()
        raise
