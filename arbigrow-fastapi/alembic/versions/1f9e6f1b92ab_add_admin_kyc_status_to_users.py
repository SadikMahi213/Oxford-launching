"""add admin_kyc_status to users

Revision ID: 1f9e6f1b92ab
Revises: 53da0533bbb2
Create Date: 2026-03-11 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1f9e6f1b92ab"
down_revision: Union[str, Sequence[str], None] = "53da0533bbb2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "admin_kyc_status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "admin_kyc_status")

