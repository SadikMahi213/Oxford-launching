"""Unit conversions with Decimal precision (§8).

unit_conversions(from_unit_id, to_unit_id, factor) means:
    qty_in_to_unit = qty_in_from_unit * factor
e.g. carton → piece, factor 24. Inverse is derived (divide), so only one
direction needs storing. Quantities are quantized to 3 decimals (grams/ml).
"""
from __future__ import annotations

import sqlite3
from decimal import Decimal, ROUND_HALF_UP

QTY = Decimal("0.001")


def to_qty(value) -> Decimal:
    return (Decimal(str(value))).quantize(QTY, rounding=ROUND_HALF_UP)


def set_conversion(conn: sqlite3.Connection, from_unit_id: int, to_unit_id: int,
                   factor, session=None) -> None:
    if session is not None:
        session.require("product.manage")
    f = Decimal(str(factor))
    if int(from_unit_id) == int(to_unit_id):
        raise ValueError("Cannot convert a unit to itself")
    if f <= 0:
        raise ValueError("Conversion factor must be positive")
    with conn:
        conn.execute("INSERT INTO unit_conversions(from_unit_id, to_unit_id, factor)"
                     " VALUES(?,?,?) ON CONFLICT(from_unit_id, to_unit_id)"
                     " DO UPDATE SET factor=excluded.factor",
                     (int(from_unit_id), int(to_unit_id), str(f)))


def convert_qty(conn: sqlite3.Connection, qty, from_unit_id: int | None,
                to_unit_id: int | None) -> Decimal:
    """Convert qty from one unit to another. None unit = already base units."""
    q = to_qty(qty)
    if from_unit_id is None or to_unit_id is None or int(from_unit_id) == int(to_unit_id):
        return q
    row = conn.execute("SELECT factor FROM unit_conversions WHERE from_unit_id=? AND to_unit_id=?",
                       (int(from_unit_id), int(to_unit_id))).fetchone()
    if row is not None:
        return (q * Decimal(str(row["factor"]))).quantize(QTY, rounding=ROUND_HALF_UP)
    inv = conn.execute("SELECT factor FROM unit_conversions WHERE from_unit_id=? AND to_unit_id=?",
                       (int(to_unit_id), int(from_unit_id))).fetchone()
    if inv is not None:
        return (q / Decimal(str(inv["factor"]))).quantize(QTY, rounding=ROUND_HALF_UP)
    raise ValueError(f"No conversion defined between units {from_unit_id} and {to_unit_id}")
