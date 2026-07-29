"""Add TokenBlacklist table for JWT revocation

Revision ID: f0a1b2c3d5e9
Revises: f0a1b2c3d5e8
Create Date: 2026-07-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f0a1b2c3d5e9"
down_revision: str | None = "f0a1b2c3d5e8"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "token_blacklist",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("jti", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_token_blacklist_id"), "token_blacklist", ["id"])
    op.create_index(
        op.f("ix_token_blacklist_jti"), "token_blacklist", ["jti"], unique=True
    )
    op.create_index(
        op.f("ix_token_blacklist_expires_at"), "token_blacklist", ["expires_at"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_token_blacklist_expires_at"), table_name="token_blacklist")
    op.drop_index(op.f("ix_token_blacklist_jti"), table_name="token_blacklist")
    op.drop_index(op.f("ix_token_blacklist_id"), table_name="token_blacklist")
    op.drop_table("token_blacklist")
