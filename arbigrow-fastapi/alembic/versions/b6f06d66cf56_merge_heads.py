"""merge_heads

Revision ID: b6f06d66cf56
Revises: c3d4e5f6a7b8, f5a6b7c8d9e0
Create Date: 2026-06-14 06:21:11.287981

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6f06d66cf56'
down_revision: Union[str, Sequence[str], None] = ('c3d4e5f6a7b8', 'f5a6b7c8d9e0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
