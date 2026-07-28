"""add bank_info table and bank_info_id to withdrawals

Revision ID: a3b4c5d6e7f8
Revises: f9e4f5a6b7c8, a7b8c9d0e1f2
Create Date: 2026-06-28 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3b4c5d6e7f8"
down_revision: Union[tuple, None] = ("f0b2c3d4e5f6", "a7b8c9d0e1f2")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bank_info",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("account_holder_name", sa.String(255), nullable=False),
        sa.Column("bank_name", sa.String(255), nullable=False),
        sa.Column("account_number", sa.String(255), nullable=False),
        sa.Column("branch_name", sa.String(255), nullable=False),
        sa.Column("branch_address", sa.Text(), nullable=False),
        sa.Column("swift_code", sa.String(50), nullable=False),
        sa.Column("routing_code", sa.String(50), nullable=True),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False),
        sa.Column("account_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bank_info_id"), "bank_info", ["id"], unique=False)
    op.create_index(op.f("ix_bank_info_user_id"), "bank_info", ["user_id"], unique=True)

    op.add_column(
        "withdrawals",
        sa.Column("bank_info_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_withdrawals_bank_info_id",
        "withdrawals",
        "bank_info",
        ["bank_info_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_withdrawals_bank_info_id", "withdrawals", type_="foreignkey")
    op.drop_column("withdrawals", "bank_info_id")
    op.drop_index(op.f("ix_bank_info_user_id"), table_name="bank_info")
    op.drop_index(op.f("ix_bank_info_id"), table_name="bank_info")
    op.drop_table("bank_info")
