"""add delivery zones, order delivery fields, and ecommerce_to_main_fee

Revision ID: 9a61c72ebfdb
Revises: 
Create Date: 2026-07-07
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "9a61c72ebfdb"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "delivery_zones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("seller_id", sa.Integer(), nullable=False, index=True),
        sa.Column("zone_name", sa.String(200), nullable=False),
        sa.Column("delivery_charge", sa.Numeric(24, 14), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_foreign_key(None, "delivery_zones", "sellers", ["seller_id"], ["id"])
    op.add_column("orders", sa.Column("delivery_charge", sa.Numeric(24, 14), nullable=False, server_default=sa.text("0")))
    op.add_column("orders", sa.Column("delivery_zone_id", sa.Integer(), nullable=True))
    op.create_foreign_key(None, "orders", "delivery_zones", ["delivery_zone_id"], ["id"])
    op.add_column("ecommerce_config", sa.Column("ecommerce_to_main_fee_percent", sa.Numeric(6, 2), nullable=False, server_default=sa.text("0")))

def downgrade() -> None:
    op.drop_column("ecommerce_config", "ecommerce_to_main_fee_percent")
    op.drop_column("orders", "delivery_zone_id")
    op.drop_column("orders", "delivery_charge")
    op.drop_table("delivery_zones")
