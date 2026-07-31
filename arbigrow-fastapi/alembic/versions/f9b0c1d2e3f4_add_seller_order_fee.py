"""Add seller order fee columns

Revision ID: f9b0c1d2e3f4
Revises: a1b2c3d4e5f6
Create Date: 2026-06-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f9b0c1d2e3f4"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ecommerce_config", sa.Column("seller_order_fee_percent", sa.Numeric(6, 2), nullable=False, server_default=sa.text("5.00")))
    op.add_column("orders", sa.Column("fee_percent", sa.Numeric(6, 2), nullable=True))
    op.add_column("orders", sa.Column("fee_amount", sa.Numeric(24, 14), nullable=True, server_default=sa.text("0")))
    op.add_column("orders", sa.Column("seller_payout", sa.Numeric(24, 14), nullable=True, server_default=sa.text("0")))


def downgrade() -> None:
    op.drop_column("orders", "seller_payout")
    op.drop_column("orders", "fee_amount")
    op.drop_column("orders", "fee_percent")
    op.drop_column("ecommerce_config", "seller_order_fee_percent")
