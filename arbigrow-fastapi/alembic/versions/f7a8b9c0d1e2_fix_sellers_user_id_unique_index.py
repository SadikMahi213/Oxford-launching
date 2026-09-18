"""Fix sellers.user_id unique index to allow multiple stores per seller

Revision ID: f7a8b9c0d1e2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-15 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the UNIQUE index on sellers.user_id
    op.drop_index("ix_sellers_user_id", table_name="sellers")
    # Recreate as non-unique index
    op.create_index("ix_sellers_user_id", "sellers", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_sellers_user_id", table_name="sellers")
    op.create_index("ix_sellers_user_id", "sellers", ["user_id"], unique=True)
