"""Admin settings + business profile (nothing hard-coded in code)."""
from __future__ import annotations

import sqlite3

DEFAULTS = {
    "printer_name": "", "receipt_size": "80mm", "auto_print": "1",
    "cash_drawer_enabled": "0", "language": "en", "backup_schedule": "daily",
    "invoice_prefix": "INV",
}


def get(conn: sqlite3.Connection, key: str, default: str = "") -> str:
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    if row is not None:
        return str(row["value"])
    if key in DEFAULTS:
        return DEFAULTS[key]
    return default


def set(conn: sqlite3.Connection, key: str, value: str, session=None) -> None:
    if session is not None:
        session.require("settings.manage")
    conn.execute("INSERT INTO settings(key, value) VALUES(?,?)"
                 " ON CONFLICT(key) DO UPDATE SET value=excluded.value,"
                 " updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')", (key, value))
    conn.commit()


def get_business(conn: sqlite3.Connection) -> dict:
    row = conn.execute("SELECT * FROM businesses WHERE id=1").fetchone()
    return dict(row) if row else {}


def save_business(conn: sqlite3.Connection, data: dict, session=None) -> None:
    if session is not None:
        session.require("settings.manage")
    allowed = ("name", "address", "phone", "bin_no", "tin_no", "vat_pct", "vat_inclusive",
               "currency", "invoice_prefix", "language", "receipt_footer")
    cols = [c for c in allowed if c in data]
    if not cols:
        return
    with conn:
        for c in cols:
            conn.execute(f"UPDATE businesses SET {c}=? WHERE id=1", (data[c],))
