"""Add performance indexes for scalability

Revision ID: f0a1b2c3d5e8
Revises: f9f5a6b7c8d9
Create Date: 2026-07-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f0a1b2c3d5e8"
down_revision: str | None = "f9f5a6b7c8d9"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute('CREATE INDEX IF NOT EXISTS "ix_users_account_status" ON "users" ("account_status")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_users_email_verified" ON "users" ("email_verified")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_users_admin_kyc_status" ON "users" ("admin_kyc_status")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_investments_package_name" ON "investments" ("package_name")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_investments_status" ON "investments" ("status")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_investments_created_at" ON "investments" ("created_at")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_deposits_user_id" ON "deposits" ("user_id")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_deposits_status" ON "deposits" ("status")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_deposits_created_at" ON "deposits" ("created_at")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_withdrawals_status" ON "withdrawals" ("status")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_withdrawals_created_at" ON "withdrawals" ("created_at")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_referral_profit_source_user_id" ON "referral_profit_history" ("source_user_id")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_referral_profit_receiver_user_id" ON "referral_profit_history" ("receiver_user_id")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_referral_profit_investment_id" ON "referral_profit_history" ("investment_id")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_referral_profit_level" ON "referral_profit_history" ("level")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_referral_profit_created_at" ON "referral_profit_history" ("created_at")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_order_items_product_id" ON "order_items" ("product_id")')
    op.execute('CREATE INDEX IF NOT EXISTS "ix_orders_created_at" ON "orders" ("created_at")')


def downgrade() -> None:
    op.drop_index("ix_users_account_status", table_name="users")
    op.drop_index("ix_users_email_verified", table_name="users")
    op.drop_index("ix_users_admin_kyc_status", table_name="users")
    op.drop_index("ix_investments_package_name", table_name="investments")
    op.drop_index("ix_investments_status", table_name="investments")
    op.drop_index("ix_investments_created_at", table_name="investments")
    op.drop_index("ix_deposits_user_id", table_name="deposits")
    op.drop_index("ix_deposits_status", table_name="deposits")
    op.drop_index("ix_deposits_created_at", table_name="deposits")
    op.drop_index("ix_withdrawals_status", table_name="withdrawals")
    op.drop_index("ix_withdrawals_created_at", table_name="withdrawals")
    op.drop_index("ix_referral_profit_source_user_id", table_name="referral_profit_history")
    op.drop_index("ix_referral_profit_receiver_user_id", table_name="referral_profit_history")
    op.drop_index("ix_referral_profit_investment_id", table_name="referral_profit_history")
    op.drop_index("ix_referral_profit_level", table_name="referral_profit_history")
    op.drop_index("ix_referral_profit_created_at", table_name="referral_profit_history")
    op.drop_index("ix_order_items_product_id", table_name="order_items")
    op.drop_index("ix_orders_created_at", table_name="orders")
