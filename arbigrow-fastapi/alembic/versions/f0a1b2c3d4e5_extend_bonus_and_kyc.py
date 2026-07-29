"""Extend referral_profit_history for deposit bonuses, add driving_license to KYC

Revision ID: f0a1b2c3d4e5
Revises: f9e4f5a6b7c8
Create Date: 2026-06-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f0a1b2c3d4e5"
down_revision: Union[str, None] = "f9e4f5a6b7c8"


def upgrade() -> None:
    op.alter_column("referral_profit_history", "investment_id",
                    existing_type=sa.Integer(),
                    nullable=True)
    op.add_column("referral_profit_history",
                  sa.Column("deposit_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_rph_deposit_id",
                          "referral_profit_history", "deposits",
                          ["deposit_id"], ["id"])
    op.alter_column("referral_profit_history", "type",
                    existing_type=sa.String(20),
                    type_=sa.String(30),
                    existing_nullable=False)
    op.execute("ALTER TYPE documenttype ADD VALUE IF NOT EXISTS 'driving_license'")


def downgrade() -> None:
    op.alter_column("referral_profit_history", "type",
                    existing_type=sa.String(30),
                    type_=sa.String(20),
                    existing_nullable=False)
    op.drop_constraint("fk_rph_deposit_id",
                       "referral_profit_history", type_="foreignkey")
    op.drop_column("referral_profit_history", "deposit_id")
    op.alter_column("referral_profit_history", "investment_id",
                    existing_type=sa.Integer(),
                    nullable=False)
