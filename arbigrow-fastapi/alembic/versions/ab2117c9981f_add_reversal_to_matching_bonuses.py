"""Add reversal tracking fields to matching_bonuses

Revision ID: ab2117c9981f
Revises: f9f7a8b9c0d1
Create Date: 2026-08-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "ab2117c9981f"
down_revision: Union[str, None] = "f9f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "matching_bonuses",
        sa.Column("is_reversed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "matching_bonuses",
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "matching_bonuses",
        sa.Column(
            "reversed_by", sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        ),
    )
    op.add_column(
        "matching_bonuses",
        sa.Column("reversal_reason", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("matching_bonuses", "reversal_reason")
    op.drop_column("matching_bonuses", "reversed_by")
    op.drop_column("matching_bonuses", "reversed_at")
    op.drop_column("matching_bonuses", "is_reversed")