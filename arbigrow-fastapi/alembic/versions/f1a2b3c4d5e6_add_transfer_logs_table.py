"""add transfer_logs table

Revision ID: f1a2b3c4d5e6
Revises: f8a9b0c1d2e3
Create Date: 2026-06-16 19:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: str | None = "f8a9b0c1d2e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "transfer_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("receiver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(24, 14), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="completed"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transfer_logs_sender_id"), "transfer_logs", ["sender_id"])
    op.create_index(op.f("ix_transfer_logs_receiver_id"), "transfer_logs", ["receiver_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_transfer_logs_receiver_id"), table_name="transfer_logs")
    op.drop_index(op.f("ix_transfer_logs_sender_id"), table_name="transfer_logs")
    op.drop_table("transfer_logs")
