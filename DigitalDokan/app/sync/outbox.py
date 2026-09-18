"""Sync outbox (§27): transactional event capture + pluggable transport engine.

Pattern: services enqueue events INSIDE their transactions (rollback removes the
event — no phantom syncs). A sync agent later ships pending rows via a Transport
with at-least-once semantics: attempts counter, exponential backoff
(next_retry_at), failed after MAX_ATTEMPTS. No cloud vendor is bundled (honest
scope: outbox + engine + transport interface + tests).
"""
from __future__ import annotations

import sqlite3
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

MAX_ATTEMPTS = 10


def enqueue(conn: sqlite3.Connection, topic: str, payload: dict) -> int:
    """Insert inside the caller's transaction. Never commits by itself."""
    import json
    cur = conn.execute("INSERT INTO outbox(topic, payload) VALUES(?,?)",
                       (topic, json.dumps(payload, default=str)))
    return int(cur.lastrowid)


class Transport(ABC):
    @abstractmethod
    def send(self, topic: str, payload: dict) -> None:
        """Ship one event; raise on failure (engine retries)."""


def _due_rows(conn: sqlite3.Connection, limit: int) -> list[dict]:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return [dict(r) for r in conn.execute(
        """SELECT * FROM outbox WHERE status='pending'
           AND (next_retry_at IS NULL OR next_retry_at <= ?)
           ORDER BY id LIMIT ?""", (now, limit)).fetchall()]


def process_outbox(conn: sqlite3.Connection, transport: Transport,
                   limit: int = 100) -> dict:
    """Ship due events. Returns {sent, failed, pending}."""
    import json
    sent = failed = 0
    for row in _due_rows(conn, limit):
        try:
            transport.send(row["topic"], json.loads(row["payload"] or "{}"))
        except Exception as e:
            attempts = int(row["attempts"]) + 1
            backoff = min(2 ** attempts, 240)  # minutes cap
            nxt = (datetime.now(timezone.utc) + timedelta(minutes=backoff)).strftime(
                "%Y-%m-%dT%H:%M:%SZ")
            status = "failed" if attempts >= MAX_ATTEMPTS else "pending"
            with conn:
                conn.execute("UPDATE outbox SET attempts=?, next_retry_at=?, last_error=?,"
                             " status=? WHERE id=?",
                             (attempts, nxt, str(e)[:500], status, row["id"]))
            failed += 1
            continue
        with conn:
            conn.execute("UPDATE outbox SET status='sent', attempts=attempts+1 WHERE id=?",
                         (row["id"],))
        sent += 1
    pending = conn.execute("SELECT COUNT(*) c FROM outbox WHERE status='pending'").fetchone()["c"]
    return {"sent": sent, "failed": failed, "pending": int(pending)}
