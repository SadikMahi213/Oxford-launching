"""add profile_image_url to users

Revision ID: 7a8b9c0d1e2f
Revises: cf35e1d6bba7
Create Date: 2026-06-15 03:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7a8b9c0d1e2f"
down_revision: Union[str, Sequence[str], None] = "cf35e1d6bba7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_image_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_image_url")
