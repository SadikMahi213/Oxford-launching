"""Add captchas_expired_today to investments

Revision ID: f9f5a6b7c8d9
Revises: f9e4f5a6b7c8
Create Date: 2026-07-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f9f5a6b7c8d9"
down_revision: Union[str, None] = "f9e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "investments",
        sa.Column(
            "captchas_expired_today",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("investments", "captchas_expired_today")
