"""Add ofa_coin_transactions table for OFA coin audit trail

Revision ID: f0a1b2c3d4e6
Revises: f9f7a8b9c0d1
Create Date: 2026-07-28 16:45:00.000000

"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "f0a1b2c3d4e6"
down_revision: str | None = "f9f7a8b9c0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ofa_coin_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("tx_type", sa.String(50), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(24, 14), nullable=False),
        sa.Column("wallet_balance_before", sa.Numeric(24, 14), nullable=False),
        sa.Column("wallet_balance_after", sa.Numeric(24, 14), nullable=False),
        sa.Column("target_wallet", sa.String(50), nullable=False),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("idempotency_key", sa.String(100), nullable=True, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index("ix_ofa_coin_transactions_id", "ofa_coin_transactions", ["id"])
    op.create_index("ix_ofa_coin_transactions_user_id", "ofa_coin_transactions", ["user_id"])
    op.create_index("ix_ofa_coin_transactions_tx_type", "ofa_coin_transactions", ["tx_type"])


def downgrade() -> None:
    op.drop_table("ofa_coin_transactions")
