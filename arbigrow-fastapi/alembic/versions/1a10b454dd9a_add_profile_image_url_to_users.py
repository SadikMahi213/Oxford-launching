"""add profile_image_url to users

Revision ID: 1a10b454dd9a
Revises: e1f2a3b4c5d6
Create Date: 2026-06-11 15:21:35.305199

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1a10b454dd9a'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('profile_image_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'profile_image_url')
