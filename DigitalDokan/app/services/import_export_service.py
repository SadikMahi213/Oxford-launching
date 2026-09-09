"""CSV/XLSX import (preview->validate->confirm->transaction) and CSV/XLSX/PDF export."""
from __future__ import annotations

import csv
import sqlite3
from decimal import Decimal


def read_csv_products(path: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def read_xlsx_products(path: str) -> list[dict]:
    from openpyxl import load_workbook
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    headers = [str(c.value or "").strip() for c in next(ws.rows)]
    rows = []
    for line in ws.iter_rows(min_row=2, values_only=True):
        rows.append({h: ("" if v is None else str(v)) for h, v in zip(headers, line)})
    return rows


def import_products(conn: sqlite3.Connection, rows: list[dict], session=None) -> dict:
    if session is not None:
        session.require("product.manage")
    from app.services.product_service import validate_import_rows, upsert_product
    valid, errors = validate_import_rows(rows)
    imported = 0
    with conn:
        for r in valid:
            try:
                upsert_product(conn, {
                    "sku": r["sku"].strip(), "name": r["name"].strip(),
                    "name_bn": r.get("name_bn", ""), "barcode": r.get("barcode", ""),
                    "cost_price": r.get("cost_price", 0) or 0,
                    "sell_price": r.get("sell_price", 0) or 0,
                    "wholesale_price": r.get("wholesale_price", 0) or 0,
                    "min_stock": r.get("min_stock", 0) or 0,
                    "reorder_level": r.get("reorder_level", 0) or 0,
                })
                imported += 1
            except Exception as e:
                errors.append(f"sku={r.get('sku')}: {e}")
    return {"imported": imported, "errors": errors}


def export_sales_csv(conn: sqlite3.Connection, path: str, start=None, end=None,
                     session=None) -> str:
    if session is not None:
        session.require("report.view")
    clauses, params = [], []
    if start:
        clauses.append("s.created_at >= ?")
        params.append(start)
    if end:
        clauses.append("s.created_at <= ?")
        params.append(end)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = conn.execute(
        f"SELECT s.invoice_no, s.created_at, u.username AS cashier, c.name AS customer,"
        f" s.subtotal, s.item_discount, s.invoice_discount, s.vat, s.total, s.paid, s.due, s.status"
        f" FROM sales s LEFT JOIN users u ON u.id=s.user_id LEFT JOIN customers c ON c.id=s.customer_id"
        f" {where} ORDER BY s.id", params).fetchall()
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["invoice_no", "created_at", "cashier", "customer", "subtotal", "item_discount",
                    "invoice_discount", "vat", "total", "paid", "due", "status"])
        w.writerows([tuple(r) for r in rows])
    return path


def _sale_rows(conn: sqlite3.Connection, start=None, end=None) -> tuple[list[str], list[tuple]]:
    clauses, params = [], []
    if start:
        clauses.append("s.created_at >= ?")
        params.append(start)
    if end:
        clauses.append("s.created_at <= ?")
        params.append(end)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = conn.execute(
        f"SELECT s.invoice_no, s.created_at, u.username AS cashier, c.name AS customer,"
        f" s.subtotal, s.item_discount, s.invoice_discount, s.vat, s.total, s.paid, s.due, s.status"
        f" FROM sales s LEFT JOIN users u ON u.id=s.user_id LEFT JOIN customers c ON c.id=s.customer_id"
        f" {where} ORDER BY s.id", params).fetchall()
    header = ["invoice_no", "created_at", "cashier", "customer", "subtotal", "item_discount",
              "invoice_discount", "vat", "total", "paid", "due", "status"]
    return header, [tuple(r) for r in rows]


def export_sales_xlsx(conn: sqlite3.Connection, path: str, start=None, end=None,
                      session=None) -> str:
    """XLSX export (optional openpyxl). App runs without it — callers fall back to CSV."""
    if session is not None:
        session.require("report.view")
    try:
        from openpyxl import Workbook
    except ImportError as e:
        raise RuntimeError("XLSX export needs the optional 'openpyxl' package") from e
    header, rows = _sale_rows(conn, start, end)
    wb = Workbook()
    ws = wb.active
    ws.title = "Sales"
    ws.append(header)
    for r in rows:
        ws.append(list(r))
    wb.save(path)
    return path


def export_sales_pdf(conn: sqlite3.Connection, path: str, start=None, end=None,
                     session=None, title: str = "Sales Report") -> str:
    """PDF export (optional reportlab). App runs without it — callers fall back to CSV."""
    if session is not None:
        session.require("report.view")
    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet
    except ImportError as e:
        raise RuntimeError("PDF export needs the optional 'reportlab' package") from e
    header, rows = _sale_rows(conn, start, end)
    doc = SimpleDocTemplate(path, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Heading1"])]
    data = [header] + [[str(c) for c in r] for r in rows[:2000]]
    tbl = Table(data, repeatRows=1)
    tbl.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                             ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                             ("FONTSIZE", (0, 0), (-1, -1), 7)]))
    story.append(tbl)
    doc.build(story)
    return path
