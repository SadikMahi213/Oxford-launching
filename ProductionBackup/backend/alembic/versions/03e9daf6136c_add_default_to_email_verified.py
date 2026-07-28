"""add default to email_verified

Revision ID: 03e9daf6136c
Revises: 2c55aa8d340b
Create Date: 2026-02-15 01:45:49.332331

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '03e9daf6136c'
down_revision: Union[str, Sequence[str], None] = '2c55aa8d340b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
