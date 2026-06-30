"""Add system_config table for admin overrides

Revision ID: a0b1c2d3e4f5
Revises: b0c1d2e3f4a5
Create Date: 2026-06-09 12:00:00.000000

"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "a0b1c2d3e4f5"
down_revision: str | None = "b0c1d2e3f4a5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "system_config",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("value", sa.String(length=255), nullable=False, server_default="true"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_system_config_id"), "system_config", ["id"])
    op.create_index(op.f("ix_system_config_key"), "system_config", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_system_config_key"), table_name="system_config")
    op.drop_index(op.f("ix_system_config_id"), table_name="system_config")
    op.drop_table("system_config")
