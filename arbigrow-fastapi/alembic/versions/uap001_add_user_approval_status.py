"""Add user approval status for OFA User Approval workflow (KYC-independent).

Revision ID: uap001_add_user_approval_status
Revises: t003_users_parent_lvl_1_idx
Create Date: 2026-09-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "uap001_add_user_approval_status"
down_revision: Union[str, Sequence[str], None] = "t003_users_parent_lvl_1_idx"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "approval_status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
    )
    # Backfill existing users as approved to avoid lockout (production safety)
    op.execute("UPDATE users SET approval_status='approved' WHERE approval_status='pending'")
    # Keep server_default pending for future registrations


def downgrade() -> None:
    op.drop_column("users", "approval_status")
