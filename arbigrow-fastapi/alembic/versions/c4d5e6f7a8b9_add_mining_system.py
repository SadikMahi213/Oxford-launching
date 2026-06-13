"""Add mining system fields and mining_logs table

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-06-09 14:00:00.000000

"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7a8b9"
down_revision: str | None = "b3c4d5e6f7a8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add new mining columns to users
    op.add_column("users", sa.Column("mining_active", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("users", sa.Column("daily_mined", sa.Numeric(24, 14), server_default="0", nullable=True))
    op.add_column("users", sa.Column("last_mine_time", sa.DateTime(timezone=True), nullable=True))

    # Create mining_logs table
    op.create_table(
        "mining_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Numeric(24, 14), nullable=False),
        sa.Column("mined_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("mined_to", sa.DateTime(timezone=True), nullable=False),
        sa.Column("daily_mined_after", sa.Numeric(24, 14), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mining_logs_id", "mining_logs", ["id"])
    op.create_index("ix_mining_logs_user_id", "mining_logs", ["user_id"])


def downgrade() -> None:
    op.drop_table("mining_logs")
    op.drop_column("users", "last_mine_time")
    op.drop_column("users", "daily_mined")
    op.drop_column("users", "mining_active")
