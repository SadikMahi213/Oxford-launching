"""Unit of Work: explicit transaction boundary for service operations.

Wraps a sqlite3 connection: BEGIN IMMEDIATE on entry, COMMIT on clean exit,
ROLLBACK on error. Exposes the same connection so existing service code keeps
working; new code should prefer `with unit_of_work(conn) as u:` over hand-rolled
BEGIN/COMMIT. Nested use reuses the outer transaction (savepoint-free: inner
blocks must not commit independently).
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator


@contextmanager
def unit_of_work(conn: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    if conn.in_transaction:
        yield conn  # join ambient transaction (e.g. LAN handler already began one)
        return
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise


def transactional(fn):
    """Decorator for service functions with signature (conn, *, session, ...)."""
    def wrapper(conn: sqlite3.Connection, *args, **kwargs):
        with unit_of_work(conn):
            return fn(conn, *args, **kwargs)
    wrapper.__name__ = fn.__name__
    wrapper.__doc__ = fn.__doc__
    return wrapper
