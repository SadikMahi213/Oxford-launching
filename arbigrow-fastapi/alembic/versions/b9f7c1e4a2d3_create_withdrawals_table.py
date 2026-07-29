"""create withdrawals table

Revision ID: b9f7c1e4a2d3
Revises: a74e0a1d14bd
Create Date: 2026-03-06 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b9f7c1e4a2d3"
down_revision: Union[str, Sequence[str], None] = "a74e0a1d14bd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "withdrawals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("source_wallet", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Numeric(precision=24, scale=14), nullable=False),
        sa.Column("destination_address", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_withdrawals_id"), "withdrawals", ["id"], unique=False)
    op.create_index(op.f("ix_withdrawals_user_id"), "withdrawals", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_withdrawals_user_id"), table_name="withdrawals")
    op.drop_index(op.f("ix_withdrawals_id"), table_name="withdrawals")
    op.drop_table("withdrawals")
