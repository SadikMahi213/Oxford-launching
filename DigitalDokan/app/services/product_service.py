"""Product catalog service: indexed search, barcode, bulk validation."""
from __future__ import annotations

import sqlite3
from decimal import Decimal


def upsert_product(conn: sqlite3.Connection, data: dict, user_id: int | None = None) -> int:
    for f in ("sku", "name", "sell_price"):
        if not data.get(f):
            raise ValueError(f"Missing required field: {f}")
    sell = Decimal(str(data["sell_price"]))
    cost = Decimal(str(data.get("cost_price", 0)))
    if sell < 0 or cost < 0:
        raise ValueError("Prices cannot be negative")
    with conn:
        cur = conn.execute(
            """INSERT INTO products(sku, name, name_bn, category_id, brand_id, unit_id, barcode,
               cost_price, sell_price, wholesale_price, vat_pct, min_stock, reorder_level,
               track_batch, track_expiry, is_active)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(sku) DO UPDATE SET name=excluded.name, name_bn=excluded.name_bn,
               category_id=excluded.category_id, brand_id=excluded.brand_id, unit_id=excluded.unit_id,
               barcode=excluded.barcode, cost_price=excluded.cost_price, sell_price=excluded.sell_price,
               wholesale_price=excluded.wholesale_price, vat_pct=excluded.vat_pct,
               min_stock=excluded.min_stock, reorder_level=excluded.reorder_level,
               track_batch=excluded.track_batch, track_expiry=excluded.track_expiry,
               is_active=excluded.is_active, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')""",
            (data["sku"].strip(), data["name"].strip(), data.get("name_bn", ""),
             data.get("category_id"), data.get("brand_id"), data.get("unit_id"),
             (data.get("barcode") or "").strip() or None, str(cost), str(sell),
             str(Decimal(str(data.get("wholesale_price", 0)))), str(Decimal(str(data.get("vat_pct", 0)))),
             str(Decimal(str(data.get("min_stock", 0)))), str(Decimal(str(data.get("reorder_level", 0)))),
             int(bool(data.get("track_batch", 0))), int(bool(data.get("track_expiry", 0))),
             int(bool(data.get("is_active", 1)))),
        )
        pid = cur.lastrowid
        if not pid:
            pid = conn.execute("SELECT id FROM products WHERE sku=?", (data["sku"].strip(),)).fetchone()["id"]
        for bc in data.get("extra_barcodes", []) or []:
            bc = bc.strip()
            if bc:
                conn.execute("INSERT OR IGNORE INTO product_barcodes(product_id, barcode) VALUES(?,?)",
                             (pid, bc))
        if data.get("barcode"):
            conn.execute("INSERT OR IGNORE INTO product_barcodes(product_id, barcode) VALUES(?,?)",
                         (pid, data["barcode"].strip()))
    return int(pid)


def lookup_barcode(conn: sqlite3.Connection, code: str) -> dict | None:
    """Near-instant indexed barcode lookup (exact match first, then product table)."""
    code = code.strip()
    if not code:
        return None
    row = conn.execute(
        """SELECT p.*, c.name AS category, b.name AS brand, u.symbol AS unit_symbol,
                  IFNULL((SELECT SUM(qty) FROM inventory_batches WHERE product_id=p.id),0) AS stock
           FROM products p LEFT JOIN product_categories c ON c.id=p.category_id
           LEFT JOIN product_brands b ON b.id=p.brand_id LEFT JOIN product_units u ON u.id=p.unit_id
           WHERE p.barcode=? OR p.sku=? LIMIT 1""", (code, code)).fetchone()
    if row is None:
        row = conn.execute(
            """SELECT p.*, c.name AS category FROM products p
               LEFT JOIN product_categories c ON c.id=p.category_id
               JOIN product_barcodes pb ON pb.product_id=p.id WHERE pb.barcode=? LIMIT 1""",
            (code,)).fetchone()
        if row is None:
            return None
        full = conn.execute("SELECT * FROM products WHERE id=?", (row["id"],)).fetchone()
        d = dict(full)
        d["stock"] = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                                  (row["id"],)).fetchone()["s"]
        return d
    return dict(row)


def search(conn: sqlite3.Connection, query: str, limit: int = 50) -> list[dict]:
    q = f"%{query.strip()}%"
    rows = conn.execute(
        """SELECT p.*, IFNULL((SELECT SUM(qty) FROM inventory_batches WHERE product_id=p.id),0) AS stock
           FROM products p WHERE p.is_active=1 AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
           ORDER BY p.name LIMIT ?""", (q, q, q, limit)).fetchall()
    return [dict(r) for r in rows]


def stock_of(conn: sqlite3.Connection, product_id: int) -> Decimal:
    row = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches WHERE product_id=?",
                       (product_id,)).fetchone()
    return Decimal(str(row["s"]))


def validate_import_rows(rows: list[dict]) -> tuple[list[dict], list[str]]:
    """Preview -> validation step for CSV/XLSX imports. Returns (valid, errors)."""
    valid, errors = [], []
    seen = set()
    for i, r in enumerate(rows, start=2):
        try:
            sku = str(r.get("sku", "")).strip()
            name = str(r.get("name", "")).strip()
            if not sku or not name:
                raise ValueError("sku and name required")
            if sku in seen:
                raise ValueError(f"duplicate sku in file: {sku}")
            seen.add(sku)
            Decimal(str(r.get("sell_price", "0")))
            Decimal(str(r.get("cost_price", "0") or "0"))
            valid.append(r)
        except Exception as e:
            errors.append(f"Row {i}: {e}")
    return valid, errors
