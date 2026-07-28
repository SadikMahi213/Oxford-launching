"""add user account hold fields

Revision ID: 8b21f5c4aa11
Revises: 1f9e6f1b92ab
Create Date: 2026-03-13 22:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8b21f5c4aa11"
down_revision: Union[str, Sequence[str], None] = "1f9e6f1b92ab"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "account_status",
            sa.String(length=20),
            nullable=False,
            server_default="active",
        ),
    )
    op.add_column(
        "users",
        sa.Column("account_issue", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "account_issue")
    op.drop_column("users", "account_status")
