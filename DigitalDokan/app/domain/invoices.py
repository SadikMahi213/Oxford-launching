"""Atomic invoice numbering safe for concurrent LAN terminals."""
from __future__ import annotations

import datetime
import sqlite3


def next_invoice_no(conn: sqlite3.Connection, prefix: str | None = None) -> str:
    """Must be called INSIDE an active transaction (BEGIN IMMEDIATE)."""
    if prefix is None:
        row = conn.execute("SELECT invoice_prefix FROM businesses WHERE id=1").fetchone()
        prefix = (row["invoice_prefix"] if row else "INV") or "INV"
    year = datetime.datetime.now().strftime("%Y")
    row = conn.execute("SELECT last_number FROM invoice_sequences WHERE prefix=? AND year=?",
                       (prefix, year)).fetchone()
    if row is None:
        conn.execute("INSERT INTO invoice_sequences(prefix, year, last_number) VALUES(?,?,1)",
                     (prefix, year))
        n = 1
    else:
        n = int(row["last_number"]) + 1
        conn.execute("UPDATE invoice_sequences SET last_number=? WHERE prefix=? AND year=?",
                     (n, prefix, year))
    return f"{prefix}-{year}-{n:06d}"
