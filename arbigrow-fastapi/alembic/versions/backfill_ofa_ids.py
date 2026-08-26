"""Backfill invoice numbers and withdrawal reference IDs.

- invoice_number: INV-* -> OFA + 6-digit zero-padded invoice.id
- withdrawals.transaction_id: NULL or 16-char random -> OFAWD + 6-digit zero-padded withdrawal.id

Revision ID: backfill_ofa_ids
Revises: widen_invoice_txid
Create Date: 2026-08-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "backfill_ofa_ids"
down_revision: Union[str, list[str], None] = "widen_invoice_txid"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    conn = op.get_bind()

    # Backfill invoice numbers: OFA + 6-digit zero-padded id
    conn.execute(sa.text("""
        UPDATE invoices
        SET invoice_number = 'OFA' || LPAD(CAST(id AS TEXT), 6, '0')
        WHERE invoice_number NOT LIKE 'OFA%'
    """))

    # Backfill withdrawal reference IDs: OFAWD + 6-digit zero-padded id
    # For withdrawals that already have a transaction_id (random 16-char),
    # replace with the proper OFAWD format.
    conn.execute(sa.text("""
        UPDATE withdrawals
        SET transaction_id = 'OFAWD' || LPAD(CAST(id AS TEXT), 6, '0')
        WHERE transaction_id IS NOT NULL
          AND transaction_id NOT LIKE 'OFAWD%'
    """))

    # For withdrawals without transaction_id, generate one
    conn.execute(sa.text("""
        UPDATE withdrawals
        SET transaction_id = 'OFAWD' || LPAD(CAST(id AS TEXT), 6, '0')
        WHERE transaction_id IS NULL
    """))


def downgrade() -> None:
    # Cannot safely reverse — original random IDs are lost
    pass
