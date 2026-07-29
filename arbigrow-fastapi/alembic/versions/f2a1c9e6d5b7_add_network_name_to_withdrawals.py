"""add network_name to withdrawals

Revision ID: f2a1c9e6d5b7
Revises: c3d8e8b1a1f4
Create Date: 2026-03-07 11:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f2a1c9e6d5b7"
down_revision: Union[str, Sequence[str], None] = "c3d8e8b1a1f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "withdrawals",
        sa.Column("network_name", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("withdrawals", "network_name")
