"""Add packages table and update investments for Oxford Financial Ads

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-06-10 10:00:00.000000

"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "d5e6f7a8b9c0"
down_revision: str | None = "c4d5e6f7a8b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create packages table
    op.create_table(
        "packages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("investment_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_return", sa.Numeric(12, 2), nullable=False),
        sa.Column("daily_payment", sa.Numeric(16, 8), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False, server_default="365"),
        sa.Column("captcha_required_per_day", sa.Integer(), nullable=False),
        sa.Column("captcha_task_duration_seconds", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_packages_id", "packages", ["id"])
    op.create_index("ix_packages_name", "packages", ["name"], unique=True)

    # Add daily_payment and captcha_required_per_day columns to investments
    op.add_column("investments", sa.Column("daily_payment", sa.Numeric(16, 8), server_default="0", nullable=True))
    op.add_column("investments", sa.Column("captcha_required_per_day", sa.Integer(), server_default="0", nullable=True))


def downgrade() -> None:
    op.drop_column("investments", "captcha_required_per_day")
    op.drop_column("investments", "daily_payment")
    op.drop_table("packages")
