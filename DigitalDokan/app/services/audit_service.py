"""Append-only audit log (DB triggers enforce immutability) + search + checkpoints."""
from __future__ import annotations

import hashlib
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


def search(conn: sqlite3.Connection, *, action: str = "", entity: str = "",
           user_id: int | None = None, since: str = "", limit: int = 200) -> list[dict]:
    """Privileged audit search for the admin toolkit (callers enforce audit.view)."""
    clauses: list[str] = []
    params: list = []
    if action:
        clauses.append("action LIKE ?")
        params.append(f"%{action}%")
    if entity:
        clauses.append("entity=?")
        params.append(entity)
    if user_id is not None:
        clauses.append("user_id=?")
        params.append(user_id)
    if since:
        clauses.append("created_at >= ?")
        params.append(since)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    return [dict(r) for r in conn.execute(
        f"SELECT a.*, u.username FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id"
        f" {where} ORDER BY a.id DESC LIMIT ?", (*params, int(limit))).fetchall()]


def _chain_digest(prev: str, rows: list[dict]) -> str:
    h = hashlib.sha256(prev.encode())
    for r in rows:
        h.update("|".join(str(r[k]) for k in
                           ("id", "action", "entity", "entity_id", "old_value",
                            "new_value", "created_at")).encode())
    return h.hexdigest()


def checkpoint(conn: sqlite3.Connection, note: str = "") -> int | None:
    """Hash-chained tamper-evidence checkpoint over new audit rows. Returns id or None."""
    last = conn.execute("SELECT up_to_id, sha256 FROM audit_checkpoints ORDER BY id DESC LIMIT 1"
                        ).fetchone()
    start, prev = (int(last["up_to_id"]), last["sha256"]) if last else (0, "GENESIS")
    rows = [dict(r) for r in conn.execute(
        "SELECT id, action, entity, entity_id, old_value, new_value, created_at FROM audit_logs"
        " WHERE id > ? ORDER BY id", (start,)).fetchall()]
    if not rows:
        return None
    digest = _chain_digest(prev, rows)
    with conn:
        cur = conn.execute("INSERT INTO audit_checkpoints(up_to_id, sha256, note) VALUES(?,?,?)",
                           (rows[-1]["id"], digest, note))
    return int(cur.lastrowid)


def verify_checkpoints(conn: sqlite3.Connection) -> list[str]:
    """Recompute the hash chain; any file-level edit of covered rows is reported."""
    issues: list[str] = []
    prev = "GENESIS"
    start = 0
    for cp in conn.execute("SELECT * FROM audit_checkpoints ORDER BY id").fetchall():
        rows = [dict(r) for r in conn.execute(
            "SELECT id, action, entity, entity_id, old_value, new_value, created_at FROM audit_logs"
            " WHERE id > ? AND id <= ? ORDER BY id", (start, cp["up_to_id"])).fetchall()]
        if _chain_digest(prev, rows) != cp["sha256"]:
            issues.append(f"audit checkpoint #{cp['id']} mismatch - log tampered")
            return issues
        prev, start = cp["sha256"], int(cp["up_to_id"])
    return issues
