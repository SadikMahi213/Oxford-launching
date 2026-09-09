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


def import_products(conn: sqlite3.Connection, rows: list[dict]) -> dict:
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


def export_sales_csv(conn: sqlite3.Connection, path: str, start=None, end=None) -> str:
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
