"""Widen Invoice.transaction_id from VARCHAR(16) to VARCHAR(128)

Deposit blockchain TXIDs (e.g. TRC20 64-char hashes) overflow the
original 16-char limit, causing silent invoice generation failures.

Revision ID: widen_invoice_txid
Revises: p6reconcile1
Create Date: 2026-08-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "widen_invoice_txid"
down_revision: Union[str, list[str], None] = "p6reconcile1"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.alter_column(
        "invoices",
        "transaction_id",
        existing_type=sa.String(length=16),
        type_=sa.String(length=128),
    )


def downgrade() -> None:
    op.alter_column(
        "invoices",
        "transaction_id",
        existing_type=sa.String(length=128),
        type_=sa.String(length=16),
    )
