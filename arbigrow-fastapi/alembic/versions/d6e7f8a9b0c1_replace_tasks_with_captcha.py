"""replace daily task engine with captcha typing system

Revision ID: d6e7f8a9b0c1
Revises: c3d4e5f6a7b8
Create Date: 2026-06-13 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, None] = "9f41de0d71c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to packages
    op.add_column("packages", sa.Column("earn_per_captcha", sa.Numeric(10, 4), server_default="0.0000", nullable=True))
    op.add_column("packages", sa.Column("daily_captcha_limit", sa.Integer(), server_default="0", nullable=True))

    # Add columns to investments
    op.add_column("investments", sa.Column("earn_per_captcha", sa.Numeric(24, 14), server_default="0", nullable=True))
    op.add_column("investments", sa.Column("captchas_typed_today", sa.Integer(), server_default="0", nullable=True))
    op.add_column("investments", sa.Column("last_captcha_date", sa.Date(), nullable=True))

    # Create captcha_challenges table
    op.create_table(
        "captcha_challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("captcha_text_hash", sa.String(length=128), nullable=False),
        sa.Column("salt", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_captcha_challenges_user_id"), "captcha_challenges", ["user_id"])

    # Create captcha_earnings table
    op.create_table(
        "captcha_earnings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("captcha_text_original", sa.String(length=500), nullable=False),
        sa.Column("user_input", sa.String(length=500), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("amount_earned", sa.Numeric(24, 14), server_default="0", nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_captcha_earnings_user_id"), "captcha_earnings", ["user_id"])

    # Drop old task engine tables
    op.drop_table("generated_tasks")
    op.drop_table("task_types")


def downgrade() -> None:
    # Re-create task_types table
    op.create_table(
        "task_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=10), nullable=True),
        sa.Column("generator_key", sa.String(length=64), nullable=False),
        sa.Column("generator_params", postgresql.JSON(), nullable=True),
        sa.Column("difficulty_levels", postgresql.JSON(), nullable=True),
        sa.Column("default_difficulty", sa.String(length=20), nullable=False),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False),
        sa.Column("points_config", postgresql.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("generator_key"),
    )

    # Re-create generated_tasks table
    op.create_table(
        "generated_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("task_type_id", sa.Integer(), nullable=True),
        sa.Column("investment_id", sa.Integer(), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("payload", postgresql.JSON(), nullable=False),
        sa.Column("answer", sa.String(length=500), nullable=False),
        sa.Column("difficulty", sa.String(length=20), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("user_answer", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["investment_id"], ["investments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["task_type_id"], ["task_types.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "date", "sort_order"),
    )

    # Drop new captcha tables and columns
    op.drop_table("captcha_earnings")
    op.drop_table("captcha_challenges")
    op.drop_column("investments", "last_captcha_date")
    op.drop_column("investments", "captchas_typed_today")
    op.drop_column("investments", "earn_per_captcha")
    op.drop_column("packages", "daily_captcha_limit")
    op.drop_column("packages", "earn_per_captcha")
