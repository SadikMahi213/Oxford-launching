"""add transfer audit snapshot fields

Revision ID: t1a2b3c4d5e6
Revises: f1a2b3c4d5e6
Create Date: 2026-09-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "t1a2b3c4d5e6"
down_revision: str | None = "f1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("transfer_logs", sa.Column("source_wallet", sa.String(50), nullable=True))
    op.add_column("transfer_logs", sa.Column("destination_wallet", sa.String(50), nullable=True))
    op.add_column("transfer_logs", sa.Column("sender_full_name", sa.String(100), nullable=True))
    op.add_column("transfer_logs", sa.Column("sender_user_no", sa.String(20), nullable=True))
    op.add_column("transfer_logs", sa.Column("sender_username", sa.String(100), nullable=True))
    op.add_column("transfer_logs", sa.Column("sender_email", sa.String(255), nullable=True))
    op.add_column("transfer_logs", sa.Column("sender_mobile", sa.String(20), nullable=True))
    op.add_column("transfer_logs", sa.Column("receiver_full_name", sa.String(100), nullable=True))
    op.add_column("transfer_logs", sa.Column("receiver_user_no", sa.String(20), nullable=True))
    op.add_column("transfer_logs", sa.Column("receiver_username", sa.String(100), nullable=True))
    op.add_column("transfer_logs", sa.Column("receiver_email", sa.String(255), nullable=True))
    op.add_column("transfer_logs", sa.Column("receiver_mobile", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("transfer_logs", "receiver_mobile")
    op.drop_column("transfer_logs", "receiver_email")
    op.drop_column("transfer_logs", "receiver_username")
    op.drop_column("transfer_logs", "receiver_user_no")
    op.drop_column("transfer_logs", "receiver_full_name")
    op.drop_column("transfer_logs", "sender_mobile")
    op.drop_column("transfer_logs", "sender_email")
    op.drop_column("transfer_logs", "sender_username")
    op.drop_column("transfer_logs", "sender_user_no")
    op.drop_column("transfer_logs", "sender_full_name")
    op.drop_column("transfer_logs", "destination_wallet")
    op.drop_column("transfer_logs", "source_wallet")
