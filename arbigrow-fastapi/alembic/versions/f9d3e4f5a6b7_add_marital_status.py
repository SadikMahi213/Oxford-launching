"""add_marital_status

Revision ID: f9d3e4f5a6b7
Revises: f9c2d3e4f5a6
Create Date: 2026-06-21 10:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "f9d3e4f5a6b7"
down_revision: str | None = "f9c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("marital_status", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "marital_status")
