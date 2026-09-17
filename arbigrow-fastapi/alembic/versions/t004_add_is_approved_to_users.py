"""Add is_approved to users for admin approval gate.

Revision ID: t004_add_is_approved
Revises: t003_users_parent_lvl_1_idx
Create Date: 2026-09-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "t004_add_is_approved"
down_revision: Union[str, Sequence[str], None] = "t003_users_parent_lvl_1_idx"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_approved flag: False for new registrations, backfilled True for existing users.
    op.add_column(
        "users",
        sa.Column(
            "is_approved",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    # Backfill existing users as approved so current production users keep access.
    # Admin users are also marked approved.
    op.execute("UPDATE users SET is_approved = true")
    # Also widen system_config.value to allow longer admin-configured pending message (up to 1000 chars).
    # Keep backward compat: if already Text, no-op (PostgreSQL will handle).
    op.alter_column("system_config", "value", type_=sa.String(length=1000), existing_type=sa.String(length=255))


def downgrade() -> None:
    op.drop_column("users", "is_approved")
    op.alter_column("system_config", "value", type_=sa.String(length=255), existing_type=sa.String(length=1000))
