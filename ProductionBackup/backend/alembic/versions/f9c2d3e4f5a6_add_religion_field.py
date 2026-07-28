"""add_religion_field

Revision ID: f9c2d3e4f5a6
Revises: f9b1c2d3e4f5
Create Date: 2026-06-21 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "f9c2d3e4f5a6"
down_revision: str | None = "f9b1c2d3e4f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("religion", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "religion")
