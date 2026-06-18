"""Increase Product name/description columns to Text

Revision ID: f8a9b0c1d2e3
Revises: 
Create Date: 2026-06-15 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f8a9b0c1d2e3"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("products", "name", type_=sa.Text(), existing_type=sa.String(300))
    op.alter_column("products", "description", type_=sa.Text(), existing_type=sa.String(2000))
    op.alter_column("products", "category", type_=sa.Text(), existing_type=sa.String(100))


def downgrade() -> None:
    op.alter_column("products", "name", type_=sa.String(300), existing_type=sa.Text())
    op.alter_column("products", "description", type_=sa.String(2000), existing_type=sa.Text())
    op.alter_column("products", "category", type_=sa.String(100), existing_type=sa.Text())
