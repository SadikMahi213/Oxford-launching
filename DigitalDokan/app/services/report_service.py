"""Reports: sales/inventory/financial/management with date & entity filters."""
from __future__ import annotations

import sqlite3
from decimal import Decimal


def _between(column: str, start: str | None, end: str | None) -> tuple[str, list]:
    clauses, params = [], []
    if start:
        clauses.append(f"{column} >= ?")
        params.append(start)
    if end:
        clauses.append(f"{column} <= ?")
        params.append(end)
    return (" AND " + " AND ".join(clauses)) if clauses else "", params


def sales_summary(conn: sqlite3.Connection, start: str | None = None, end: str | None = None,
                   group_by: str = "day", session=None) -> list[dict]:
    if session is not None:
        session.require("report.view")
    extra, params = _between("s.created_at", start, end)
    bucket = {"day": "date(s.created_at)", "month": "strftime('%Y-%m', s.created_at)",
              "week": "strftime('%Y-W%V', s.created_at)", "hour": "strftime('%H', s.created_at)",
              "cashier": "u.username", "payment": "sp.method",
              "register": "COALESCE(s.register_no, t.code, '')",
              "branch": "COALESCE(b.code, '')"}.get(group_by, "date(s.created_at)")
    join = (" FROM sales s LEFT JOIN users u ON u.id=s.user_id"
            " LEFT JOIN terminals t ON t.id=s.terminal_id LEFT JOIN branches b ON b.id=s.branch_id"
            f" WHERE s.status='completed'{extra}")
    if group_by == "payment":
        rows = conn.execute(
            f"SELECT sp.method AS bucket, SUM(sp.amount) total, COUNT(DISTINCT s.id) bills"
            f" FROM sales s JOIN sale_payments sp ON sp.sale_id=s.id LEFT JOIN users u ON u.id=s.user_id"
            f" WHERE s.status='completed'{extra} GROUP BY sp.method ORDER BY total DESC", params).fetchall()
    else:
        rows = conn.execute(
            f"SELECT {bucket} AS bucket, SUM(s.total) total, SUM(s.paid) paid, SUM(s.due) due,"
            f" COUNT(*) bills{join} GROUP BY bucket ORDER BY bucket", params).fetchall()
    return [dict(r) for r in rows]


def paginate(conn: sqlite3.Connection, base_sql: str, params: tuple = (),
             page: int = 1, per_page: int = 100, session=None) -> dict:
    """Keyset-free paged query for large tables (§32: reports must not freeze UI)."""
    if session is not None:
        session.require("report.view")
    page, per_page = max(1, int(page)), min(1000, max(1, int(per_page)))
    total = conn.execute(f"SELECT COUNT(*) c FROM ({base_sql})", params).fetchone()["c"]
    rows = conn.execute(f"{base_sql} LIMIT ? OFFSET ?", (*params, per_page,
                                                         (page - 1) * per_page)).fetchall()
    pages = (int(total) + per_page - 1) // per_page
    return {"rows": [dict(r) for r in rows], "total": int(total), "page": page,
            "per_page": per_page, "pages": pages}


def receivables(conn: sqlite3.Connection, session=None) -> list[dict]:
    if session is not None:
        session.require("report.view")
    return [dict(r) for r in conn.execute(
        """SELECT c.id, c.name, c.phone, c.balance, c.credit_limit,
                  (SELECT MAX(s.created_at) FROM sales s
                   WHERE s.customer_id=c.id AND s.status='completed') AS last_sale
           FROM customers c WHERE c.balance > 0 ORDER BY c.balance DESC""").fetchall()]


def payables(conn: sqlite3.Connection, session=None) -> list[dict]:
    if session is not None:
        session.require("report.view")
    return [dict(r) for r in conn.execute(
        """SELECT s.id, s.name, s.phone, s.balance,
                  (SELECT MAX(p.created_at) FROM purchases p
                   WHERE p.supplier_id=s.id) AS last_purchase
           FROM suppliers s WHERE s.balance > 0 ORDER BY s.balance DESC""").fetchall()]


def cash_reconciliation(conn: sqlite3.Connection, shift_id: int, session=None) -> dict:
    """Read-only expected-cash breakdown for a shift (same math as close_shift)."""
    if session is not None:
        session.require("report.view")
    sh = conn.execute("SELECT * FROM cash_sessions WHERE id=?", (shift_id,)).fetchone()
    if sh is None:
        raise ValueError("Shift not found")
    by_method = {r["method"]: str(r["t"]) for r in conn.execute(
        "SELECT method, SUM(amount) t FROM sale_payments sp JOIN sales s ON s.id=sp.sale_id"
        " WHERE s.shift_id=? AND s.status='completed' GROUP BY method", (shift_id,))}
    io_in = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM cash_movements WHERE shift_id=?"
                         " AND direction='in'", (shift_id,)).fetchone()["s"]
    io_out = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM cash_movements WHERE shift_id=?"
                          " AND direction='out'", (shift_id,)).fetchone()["s"]
    exp_cash = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM expenses"
                            " WHERE method='cash' AND shift_id=?", (shift_id,)).fetchone()["s"]
    from decimal import Decimal
    from app.domain.money import to_money
    expected = (to_money(sh["opening_cash"]) + to_money(by_method.get("cash", 0))
                + to_money(io_in) - to_money(io_out) - to_money(exp_cash))
    return {"shift_id": shift_id, "status": sh["status"],
            "opening_cash": str(to_money(sh["opening_cash"])), "by_method": by_method,
            "cash_in": str(to_money(io_in)), "cash_out": str(to_money(io_out)),
            "cash_expenses": str(to_money(exp_cash)), "expected_cash": str(expected),
            "actual_cash": str(sh["actual_cash"] or 0), "difference": str(sh["difference"] or 0)}


def product_sales(conn: sqlite3.Connection, start=None, end=None, limit: int = 50,
                      session=None) -> list[dict]:
    if session is not None:
        session.require("report.view")
    extra, params = _between("s.created_at", start, end)
    rows = conn.execute(
        f"SELECT p.sku, p.name, SUM(si.qty) qty, SUM(si.line_total) revenue,"
        f" SUM((si.unit_price - COALESCE(si.unit_cost, p.cost_price)) * si.qty) profit_est"
        f" FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN products p ON p.id=si.product_id"
        f" WHERE s.status='completed'{extra} GROUP BY p.id ORDER BY revenue DESC LIMIT ?", (*params, limit)).fetchall()
    return [dict(r) for r in rows]


def stock_report(conn: sqlite3.Connection, low_only: bool = False, session=None) -> list[dict]:
    if session is not None:
        session.require("report.view")
    q = """SELECT p.sku, p.name, IFNULL(SUM(b.qty),0) stock, p.min_stock, p.cost_price,
                  IFNULL(SUM(b.qty),0) * p.cost_price AS valuation
           FROM products p LEFT JOIN inventory_batches b ON b.product_id=p.id
           WHERE p.is_active=1 GROUP BY p.id"""
    if low_only:
        q += " HAVING stock <= p.min_stock"
    q += " ORDER BY p.name"
    return [dict(r) for r in conn.execute(q).fetchall()]


def near_expiry(conn: sqlite3.Connection, within_days: int = 30, session=None) -> list[dict]:
    if session is not None:
        session.require("report.view")
    return [dict(r) for r in conn.execute(
        """SELECT p.sku, p.name, b.batch_no, b.expiry_date, b.qty FROM inventory_batches b
           JOIN products p ON p.id=b.product_id
           WHERE b.expiry_date IS NOT NULL AND b.expiry_date != ''
             AND date(b.expiry_date) <= date('now', ?)
           ORDER BY b.expiry_date""", (f"+{int(within_days)} days",)).fetchall()]


def profit_summary(conn: sqlite3.Connection, start=None, end=None, session=None) -> dict:
    if session is not None:
        session.require("report.view")
    extra, params = _between("s.created_at", start, end)
    r = conn.execute(
        f"SELECT IFNULL(SUM(s.total),0) revenue, IFNULL(SUM(s.invoice_discount + s.item_discount),0) discounts,"
        f" IFNULL(SUM(s.vat),0) vat FROM sales s WHERE s.status='completed'{extra}", params).fetchone()
    cogs = conn.execute(
        f"SELECT IFNULL(SUM(si.qty * p.cost_price),0) c FROM sale_items si"
        f" JOIN sales s ON s.id=si.sale_id JOIN products p ON p.id=si.product_id"
        f" WHERE s.status='completed'{extra}", params).fetchone()["c"]
    exp = conn.execute("SELECT IFNULL(SUM(amount),0) s FROM expenses").fetchone()["s"]
    revenue = Decimal(str(r["revenue"]))
    gross = revenue - Decimal(str(cogs))
    net = gross - Decimal(str(exp))
    return {"revenue": str(revenue), "cogs": str(Decimal(str(cogs))),
            "gross_profit": str(gross), "expenses": str(Decimal(str(exp))),
            "net_estimate": str(net), "discounts": str(Decimal(str(r["discounts"]))),
            "vat": str(Decimal(str(r["vat"])))}
