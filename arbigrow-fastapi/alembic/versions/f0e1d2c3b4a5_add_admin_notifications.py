"""add admin_notifications table

Revision ID: f0e1d2c3b4a5
Revises: a1b2c3d4e5f6, d0e1f2a3b4c5
Create Date: 2026-06-19 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f0e1d2c3b4a5"
down_revision: Union[str, None] = "f9b0c1d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "admin_notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=20), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("device", sa.String(length=255), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_admin_notifications_id"), "admin_notifications", ["id"])
    op.create_index(op.f("ix_admin_notifications_type"), "admin_notifications", ["type"])
    op.create_index(op.f("ix_admin_notifications_priority"), "admin_notifications", ["priority"])
    op.create_index(op.f("ix_admin_notifications_user_id"), "admin_notifications", ["user_id"])
    op.create_index(op.f("ix_admin_notifications_is_read"), "admin_notifications", ["is_read"])
    op.create_index(op.f("ix_admin_notifications_created_at"), "admin_notifications", ["created_at"])
    op.create_index("ix_notifications_unread_created", "admin_notifications", ["is_read", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_unread_created", table_name="admin_notifications")
    op.drop_index(op.f("ix_admin_notifications_created_at"), table_name="admin_notifications")
    op.drop_index(op.f("ix_admin_notifications_is_read"), table_name="admin_notifications")
    op.drop_index(op.f("ix_admin_notifications_user_id"), table_name="admin_notifications")
    op.drop_index(op.f("ix_admin_notifications_priority"), table_name="admin_notifications")
    op.drop_index(op.f("ix_admin_notifications_type"), table_name="admin_notifications")
    op.drop_index(op.f("ix_admin_notifications_id"), table_name="admin_notifications")
    op.drop_table("admin_notifications")
