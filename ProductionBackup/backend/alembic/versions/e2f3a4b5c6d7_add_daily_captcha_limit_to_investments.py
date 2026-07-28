"""add daily_captcha_limit to investments

Revision ID: e2f3a4b5c6d7
Revises: d6e7f8a9b0c1
Create Date: 2026-06-13 11:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, None] = "d6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("investments", sa.Column("daily_captcha_limit", sa.Integer(), server_default="0", nullable=True))


def downgrade() -> None:
    op.drop_column("investments", "daily_captcha_limit")
