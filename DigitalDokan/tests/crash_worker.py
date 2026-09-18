"""Crash worker: opens the DB, writes a PARTIAL sale inside an open transaction,
then dies without commit (os._exit) — simulating power loss / process kill.
Usage: python crash_worker.py <db_path> <invoice_marker>
"""
import os
import sqlite3
import sys


def main() -> None:
    db_path, marker = sys.argv[1], sys.argv[2]
    conn = sqlite3.connect(db_path, timeout=30.0, isolation_level=None)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=30000;")
    conn.execute("BEGIN IMMEDIATE")
    conn.execute("INSERT INTO sales(invoice_no, user_id, subtotal, total, paid, due)"
                 " VALUES(?,1,140,140,140,0)", (marker,))
    conn.execute("INSERT INTO sale_items(sale_id, product_id, qty, unit_price, line_total)"
                 " VALUES(last_insert_rowid(),1,2,70,140)")
    # NOTE: no sale_payments row, no commit — the crash happens here.
    sys.stdout.flush()
    os._exit(137)


if __name__ == "__main__":
    main()
