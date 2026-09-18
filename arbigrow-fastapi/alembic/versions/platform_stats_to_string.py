"""platform_stats columns to string for flexible values

- total_users: Integer -> String(100)
- total_invested: Numeric(24,14) -> String(100)
- total_withdrawn: Numeric(24,14) -> String(100)
- total_profit_shared: Numeric(24,14) -> String(100)
- active_investors: Integer -> String(100)

Revision ID: platform_stats_to_string
Revises: backfill_ofa_ids
Create Date: 2026-08-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "platform_stats_to_string"
down_revision: Union[str, Sequence[str], None] = "backfill_ofa_ids"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("platform_stats", "total_users", type_=sa.String(100), server_default="0")
    op.alter_column("platform_stats", "total_invested", type_=sa.String(100), server_default="0")
    op.alter_column("platform_stats", "total_withdrawn", type_=sa.String(100), server_default="0")
    op.alter_column("platform_stats", "total_profit_shared", type_=sa.String(100), server_default="0")
    op.alter_column("platform_stats", "active_investors", type_=sa.String(100), server_default="0")


def downgrade() -> None:
    op.alter_column("platform_stats", "total_users", type_=sa.Integer(), server_default="0")
    op.alter_column("platform_stats", "total_invested", type_=sa.Numeric(24, 14), server_default="0")
    op.alter_column("platform_stats", "total_withdrawn", type_=sa.Numeric(24, 14), server_default="0")
    op.alter_column("platform_stats", "total_profit_shared", type_=sa.Numeric(24, 14), server_default="0")
    op.alter_column("platform_stats", "active_investors", type_=sa.Integer(), server_default="0")
