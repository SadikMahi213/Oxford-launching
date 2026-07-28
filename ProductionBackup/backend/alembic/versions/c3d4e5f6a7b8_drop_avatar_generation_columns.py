"""drop avatar generation columns from users

Revision ID: c3d4e5f6a7b8
Revises: b2c1d3e4f5a6
Create Date: 2026-06-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c1d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('users', 'generated_avatar_url')
    op.drop_column('users', 'generation_status')


def downgrade() -> None:
    op.add_column('users', sa.Column('generated_avatar_url', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('generation_status', sa.String(20), nullable=True))
