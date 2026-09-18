"""Merge heads and add transaction_id to invoices and withdrawals

Revision ID: f1b2c3d4e5f0
Revises: f0a1b2c3d4e6, f0a1b2c3d5e9
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1b2c3d4e5f0"
down_revision: str | tuple[str, ...] = ("f0a1b2c3d4e6", "f0a1b2c3d5e9")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("transaction_id", sa.String(16), nullable=True))
    op.create_index(op.f("ix_invoices_transaction_id"), "invoices", ["transaction_id"], unique=True)

    op.add_column("withdrawals", sa.Column("transaction_id", sa.String(16), nullable=True))
    op.create_index(op.f("ix_withdrawals_transaction_id"), "withdrawals", ["transaction_id"], unique=True)

    conn = op.get_bind()
    import secrets
    import string
    alnum = string.ascii_uppercase + string.digits
    meta = sa.MetaData()
    meta.reflect(only=("invoices",), bind=conn)
    invoices_table = meta.tables["invoices"]
    result = conn.execute(
        sa.select(invoices_table.c.id).where(invoices_table.c.transaction_id.is_(None))
    )
    for (row_id,) in result:
        txid = "".join(secrets.choice(alnum) for _ in range(16))
        conn.execute(
            sa.update(invoices_table)
            .where(invoices_table.c.id == row_id)
            .values(transaction_id=txid)
        )

    op.alter_column("invoices", "transaction_id", nullable=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_withdrawals_transaction_id"), table_name="withdrawals")
    op.drop_column("withdrawals", "transaction_id")
    op.drop_index(op.f("ix_invoices_transaction_id"), table_name="invoices")
    op.drop_column("invoices", "transaction_id")
