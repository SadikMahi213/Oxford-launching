"""Add whatsapp_number to sellers

Revision ID: f6a7b8c9d0e1
Revises: 8d2574785b6c
Create Date: 2026-06-15 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "8d2574785b6c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sellers", sa.Column("whatsapp_number", sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column("sellers", "whatsapp_number")
