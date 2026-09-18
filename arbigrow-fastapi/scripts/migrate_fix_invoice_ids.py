"""
Migration script: Fix invoice + transaction_id data issues found in audit.

Run inside the backend container:
  docker exec arbigrow-backend python /app/scripts/migrate_fix_invoice_ids.py

Safe to run multiple times (idempotent).
"""

import asyncio
import secrets
import string
import sys
import os

import asyncpg

ALPHANUMERIC = string.ascii_uppercase + string.digits
DSN = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@postgres:5432/arbigrow",
).replace("+asyncpg", "")


def format_invoice_number(record_id: int) -> str:
    return f"OFA{record_id:06d}"


def format_withdrawal_reference(record_id: int) -> str:
    random_suffix = "".join(secrets.choice(ALPHANUMERIC) for _ in range(8))
    return f"OFAWD-{random_suffix}"


async def fix_old_format_invoices(conn):
    """Fix 4 invoices with INV-* format → OFA###### format."""
    rows = await conn.fetch(
        "SELECT id, invoice_number FROM invoices "
        "WHERE invoice_number NOT LIKE 'OFA%' AND invoice_number != 'PENDING' "
        "ORDER BY id"
    )
    if not rows:
        print("[OK] No old-format invoices to fix.")
        return

    print(f"[FIX] Found {len(rows)} old-format invoices:")
    for r in rows:
        new_number = format_invoice_number(r["id"])
        # Check target doesn't already exist
        exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM invoices WHERE invoice_number = $1)",
            new_number,
        )
        if exists:
            print(f"  SKIP {r['invoice_number']} → {new_number} (already exists)")
            continue

        await conn.execute(
            "UPDATE invoices SET invoice_number = $1 WHERE id = $2",
            new_number,
            r["id"],
        )
        print(f"  FIXED {r['invoice_number']} → {new_number}")


async def fix_null_withdrawal_txids(conn):
    """Fix withdrawals with NULL transaction_id."""
    rows = await conn.fetch(
        "SELECT id FROM withdrawals WHERE transaction_id IS NULL ORDER BY id"
    )
    if not rows:
        print("[OK] No withdrawals with NULL transaction_id.")
        return

    print(f"[FIX] Found {len(rows)} withdrawals with NULL transaction_id:")
    for r in rows:
        new_ref = format_withdrawal_reference(r["id"])
        # Ensure uniqueness
        while await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM withdrawals WHERE transaction_id = $1)",
            new_ref,
        ):
            new_ref = format_withdrawal_reference(r["id"])

        await conn.execute(
            "UPDATE withdrawals SET transaction_id = $1 WHERE id = $2",
            new_ref,
            r["id"],
        )
        print(f"  FIXED withdrawal#{r['id']} → {new_ref}")


async def generate_missing_withdrawal_invoices(conn):
    """Generate invoices for approved withdrawals that have no invoice."""
    rows = await conn.fetch("""
        SELECT w.id, w.user_id, w.amount, w.charge, w.status,
               w.network_name, w.destination_address, w.transaction_id,
               w.created_at, w.source_wallet
        FROM withdrawals w
        LEFT JOIN invoices i ON i.reference_id = w.id AND i.reference_type = 'withdrawal'
        WHERE i.id IS NULL AND w.status = 'approved'
        ORDER BY w.id
    """)
    if not rows:
        print("[OK] No approved withdrawals missing invoices.")
        return

    print(f"[FIX] Found {len(rows)} approved withdrawals without invoices:")
    for w in rows:
        inv_number = format_invoice_number(900000 + w["id"])  # Use a high offset to avoid collision
        tx_id = w["transaction_id"] or format_withdrawal_reference(w["id"])
        amount = float(w["amount"])
        fee = float(w["charge"] or 0)
        desc = f"Withdrawal of {amount:.2f} USDT via {w['network_name'] or 'bank'}"
        now = w["created_at"]

        # Check invoice_number collision
        exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM invoices WHERE invoice_number = $1)",
            inv_number,
        )
        if exists:
            print(f"  SKIP withdrawal#{w['id']} → {inv_number} (collision)")
            continue

        await conn.execute("""
            INSERT INTO invoices
                (user_id, invoice_type, invoice_number, transaction_id,
                 amount, currency, status, description,
                 reference_id, reference_type, created_at, updated_at)
            VALUES ($1, 'withdrawal', $2, $3, $4, 'USDT', 'completed', $5,
                    $6, 'withdrawal', $7, $7)
        """,
            w["user_id"],
            inv_number,
            tx_id,
            amount,
            desc,
            w["id"],
            now,
        )
        print(f"  CREATED invoice {inv_number} for withdrawal#{w['id']} (txid={tx_id})")


async def main():
    print("=" * 60)
    print("Invoice + Transaction ID Migration")
    print("=" * 60)

    conn = await asyncpg.connect(DSN)
    try:
        await fix_old_format_invoices(conn)
        print()
        await fix_null_withdrawal_txids(conn)
        print()
        await generate_missing_withdrawal_invoices(conn)
        print()
        print("=" * 60)
        print("Migration complete.")
        print("=" * 60)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
