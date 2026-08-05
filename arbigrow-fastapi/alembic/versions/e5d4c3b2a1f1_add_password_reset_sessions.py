"""Add password_reset_sessions table

Revision ID: e5d4c3b2a1f1
Revises: f1b2c3d4e5f0
Create Date: 2026-08-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5d4c3b2a1f1"
down_revision: str | None = "f1b2c3d4e5f0"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "password_reset_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("device", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_password_reset_sessions_id"), "password_reset_sessions", ["id"]
    )
    op.create_index(
        op.f("ix_password_reset_sessions_token_hash"),
        "password_reset_sessions",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_password_reset_sessions_user_id"),
        "password_reset_sessions",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_password_reset_sessions_user_id"), table_name="password_reset_sessions"
    )
    op.drop_index(
        op.f("ix_password_reset_sessions_token_hash"),
        table_name="password_reset_sessions",
    )
    op.drop_index(
        op.f("ix_password_reset_sessions_id"), table_name="password_reset_sessions"
    )
    op.drop_table("password_reset_sessions")
