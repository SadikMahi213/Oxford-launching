"""Add rejection_message to users for snapshot of admin rejection message.

Revision ID: t005_add_rejection_message
Revises: t004_add_is_approved
Create Date: 2026-09-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "t005_add_rejection_message"
down_revision: Union[str, Sequence[str], None] = "t004_add_is_approved"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "rejection_message",
            sa.Text(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "rejection_message")
