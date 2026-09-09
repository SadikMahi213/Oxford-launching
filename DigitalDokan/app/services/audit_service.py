"""Append-only audit log (DB triggers enforce immutability)."""
from __future__ import annotations

import sqlite3


def record(conn: sqlite3.Connection, *, user_id: int | None, action: str, entity: str,
           entity_id: str = "", old_value: str = "", new_value: str = "",
           reason: str = "", terminal_code: str = "") -> None:
    conn.execute(
        "INSERT INTO audit_logs(user_id, terminal_code, action, entity, entity_id, old_value, new_value, reason)"
        " VALUES(?,?,?,?,?,?,?,?)",
        (user_id, terminal_code, action, entity, str(entity_id),
         str(old_value)[:4000], str(new_value)[:4000], str(reason)[:1000]),
    )
