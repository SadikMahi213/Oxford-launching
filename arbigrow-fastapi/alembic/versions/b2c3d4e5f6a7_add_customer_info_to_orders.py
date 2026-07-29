"""add customer info fields to orders

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-09 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("customer_name", sa.String(200), nullable=True))
    op.add_column("orders", sa.Column("customer_email", sa.String(255), nullable=True))
    op.add_column("orders", sa.Column("customer_phone", sa.String(50), nullable=True))
    op.add_column("orders", sa.Column("customer_address", sa.String(500), nullable=True))
    op.alter_column("orders", "user_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("orders", "user_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("orders", "customer_address")
    op.drop_column("orders", "customer_phone")
    op.drop_column("orders", "customer_email")
    op.drop_column("orders", "customer_name")
