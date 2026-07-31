"""add email otp fields

Revision ID: e9e3a7a3f1d2
Revises: a4b251ae746a
Create Date: 2026-03-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9e3a7a3f1d2'
down_revision: Union[str, Sequence[str], None] = 'a4b251ae746a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('otp_code', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('otp_expiry', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'otp_expiry')
    op.drop_column('users', 'otp_code')
