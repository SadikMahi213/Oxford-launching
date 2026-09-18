"""add withdrawal_methods table and columns to withdrawals

Revision ID: c1d2e3f4a5b6
Revises: d9e8f7c6b5a4
Create Date: 2026-06-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "d9e8f7c6b5a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "withdrawal_methods",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("method_type", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("wallet_address", sa.String(length=255), nullable=True),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("min_amount", sa.Numeric(precision=24, scale=14), nullable=True),
        sa.Column("max_amount", sa.Numeric(precision=24, scale=14), nullable=True),
        sa.Column("fixed_fee", sa.Numeric(precision=24, scale=14), nullable=True, server_default=sa.text("0")),
        sa.Column("percent_fee", sa.Numeric(precision=5, scale=2), nullable=True, server_default=sa.text("0")),
        sa.Column("status", sa.Boolean(), nullable=True, server_default=sa.text("true")),
        sa.Column("date_created", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_withdrawal_methods_status"), "withdrawal_methods", ["status"])

    op.add_column("withdrawals", sa.Column("withdrawal_method_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_withdrawals_withdrawal_method_id",
        "withdrawals", "withdrawal_methods",
        ["withdrawal_method_id"], ["id"],
    )
    op.add_column("withdrawals", sa.Column("method_type", sa.String(length=20), nullable=True))
    op.add_column("withdrawals", sa.Column("account_type", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_constraint("fk_withdrawals_withdrawal_method_id", "withdrawals", type_="foreignkey")
    op.drop_column("withdrawals", "account_type")
    op.drop_column("withdrawals", "method_type")
    op.drop_column("withdrawals", "withdrawal_method_id")
    op.drop_index(op.f("ix_withdrawal_methods_status"), table_name="withdrawal_methods")
    op.drop_table("withdrawal_methods")
