"""Add user_no column to users table

Revision ID: f0c1d2e3f4a7
Revises: f1a2b3c4d5e6, c1d2e3f4a5b6
Create Date: 2026-07-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f0c1d2e3f4a7"
down_revision: Union[str, Sequence[str], None] = (
    "f1a2b3c4d5e6",
    "c1d2e3f4a5b6",
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
