"""Add kyc_hold to users, wallet_transactions, company_wallet tables,
add refunded to paymentstatus enum

Revision ID: f9f7a8b9c0d1
Revises: f9f6a7b8c9d0
Create Date: 2026-07-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f9f7a8b9c0d1"
down_revision: Union[str, None] = "f9f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "kyc_hold",
            sa.Numeric(24, 14),
            server_default="0",
            nullable=True,
        ),
    )

    op.create_table(
        "wallet_transactions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("type", sa.String(30), nullable=False, index=True),
        sa.Column("wallet_type", sa.String(30), nullable=False),
        sa.Column("amount", sa.Numeric(24, 14), nullable=False),
        sa.Column("balance_before", sa.Numeric(24, 14), nullable=True),
        sa.Column("balance_after", sa.Numeric(24, 14), nullable=True),
        sa.Column("reference_type", sa.String(30), nullable=True),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="held"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "company_wallet",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("total_kyc_collected", sa.Numeric(24, 14), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.execute("ALTER TYPE paymentstatus ADD VALUE IF NOT EXISTS 'refunded'")


def downgrade() -> None:
    op.drop_column("users", "kyc_hold")
    op.drop_table("wallet_transactions")
    op.drop_table("company_wallet")
