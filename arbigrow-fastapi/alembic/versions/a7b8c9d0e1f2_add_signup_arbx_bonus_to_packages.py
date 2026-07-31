"""Add signup_arbx_bonus column to packages

Revision ID: a7b8c9d0e1f2
Revises: b0c1d2e3f4a5, a2b3c4d5e6f7
Create Date: 2026-06-20 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: tuple = ("b0c1d2e3f4a5", "a2b3c4d5e6f7")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "packages",
        sa.Column("signup_arbx_bonus", sa.Numeric(24, 14), nullable=False, server_default="0.00000000000000"),
    )


def downgrade() -> None:
    op.drop_column("packages", "signup_arbx_bonus")
