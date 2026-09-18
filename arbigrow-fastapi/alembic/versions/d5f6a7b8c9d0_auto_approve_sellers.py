"""Auto-approve sellers on registration

Revision ID: d5f6a7b8c9d0
Revises: b2c3d4e5f6a7
Create Date: 2026-06-09 06:00:00.000000

"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "d5f6a7b8c9d0"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE sellers SET status = 'approved' WHERE status = 'pending'")


def downgrade() -> None:
    op.execute("UPDATE sellers SET status = 'pending' WHERE status = 'approved'")
