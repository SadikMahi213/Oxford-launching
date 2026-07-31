"""add generation_status to users

Revision ID: b2c1d3e4f5a6
Revises: a9b8c7d6e5f4
Create Date: 2026-06-11 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c1d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a9b8c7d6e5f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('generation_status', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'generation_status')
