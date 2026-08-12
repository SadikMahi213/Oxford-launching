"""Add last_active_at heartbeat column to users

Tracks real member activity (updated on each authenticated request, throttled
to once per minute) so the admin dashboard can report members currently online
instead of anonymous visitor sessions.

Revision ID: p4addlastactiveat1
Revises: 9a61c72ebfdb, ab2117c9981f, d0e1f2b3c4a5, e5d4c3b2a1f0
Create Date: 2026-08-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p4addlastactiveat1"
down_revision: Union[str, list[str], None] = [
    "9a61c72ebfdb",
    "ab2117c9981f",
    "d0e1f2b3c4a5",
    "e5d4c3b2a1f0",
]
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_users_last_active_at"), "users", ["last_active_at"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_last_active_at"), table_name="users")
    op.drop_column("users", "last_active_at")
