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
              "cashier": "u.username", "payment": "sp.method"}.get(group_by, "date(s.created_at)")
    if group_by == "payment":
        rows = conn.execute(
            f"SELECT sp.method AS bucket, SUM(sp.amount) total, COUNT(DISTINCT s.id) bills"
            f" FROM sales s JOIN sale_payments sp ON sp.sale_id=s.id LEFT JOIN users u ON u.id=s.user_id"
            f" WHERE s.status='completed'{extra} GROUP BY sp.method ORDER BY total DESC", params).fetchall()
    else:
        rows = conn.execute(
            f"SELECT {bucket} AS bucket, SUM(s.total) total, SUM(s.paid) paid, SUM(s.due) due,"
            f" COUNT(*) bills FROM sales s LEFT JOIN users u ON u.id=s.user_id"
            f" WHERE s.status='completed'{extra} GROUP BY bucket ORDER BY bucket", params).fetchall()
    return [dict(r) for r in rows]


def product_sales(conn: sqlite3.Connection, start=None, end=None, limit: int = 50,
                      session=None) -> list[dict]:
    if session is not None:
        session.require("report.view")
    extra, params = _between("s.created_at", start, end)
    rows = conn.execute(
        f"SELECT p.sku, p.name, SUM(si.qty) qty, SUM(si.line_total) revenue,"
        f" SUM((si.unit_price - p.cost_price) * si.qty) profit_est"
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
