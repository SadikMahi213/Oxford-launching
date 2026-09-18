"""merge seller and invoice heads

Revision ID: 8d2574785b6c
Revises: 8b9c0d1e2f3a, ce6d9a2b5f01
Create Date: 2026-06-15 16:28:09.802338

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d2574785b6c'
down_revision: Union[str, Sequence[str], None] = ('8b9c0d1e2f3a', 'ce6d9a2b5f01')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
