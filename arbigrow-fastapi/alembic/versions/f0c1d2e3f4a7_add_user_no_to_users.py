"""Add user_no column to users table (merge all heads)

Revision ID: f0c1d2e3f4a7
Revises: 7a8b9c0d1e2f, a2b3c4d5e6f7, a7b8c9d0e1f2, c1d2e3f4a5b6, ce6d9a2b5f01, d0e1f2a3b4c5, d5e6f7a8b9c0, f0e1d2c3b4a5, f1a2b3c4d5e6, f5a6b7c8d9e0, f7a8b9c0d1e2
Create Date: 2026-07-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f0c1d2e3f4a7"
down_revision: Union[str, Sequence[str], None] = (
    "7a8b9c0d1e2f",
    "a2b3c4d5e6f7",
    "a7b8c9d0e1f2",
    "c1d2e3f4a5b6",
    "ce6d9a2b5f01",
    "d0e1f2a3b4c5",
    "d5e6f7a8b9c0",
    "f0e1d2c3b4a5",
    "f1a2b3c4d5e6",
    "f5a6b7c8d9e0",
    "f7a8b9c0d1e2",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("user_no", sa.String(20), nullable=True))
    op.create_index("ix_users_user_no", "users", ["user_no"], unique=True)

    # Backfill user_no for existing users using their id
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE users SET user_no = TO_CHAR(created_at, 'YYYY') || LPAD(id::text, 6, '0') "
            "WHERE user_no IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_index("ix_users_user_no")
    op.drop_column("users", "user_no")
