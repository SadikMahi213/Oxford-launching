"""add login security fields and security_logs table

Revision ID: a2b3c4d5e6f7
Revises: 1f9e6f1b92ab, 53da0533bbb2, 7a8b9c0d1e2f, 8b21f5c4aa11, 8b9c0d1e2f3a, 8d2574785b6c, 9f41de0d71c2, a0b1c2d3e4f5, a1b2c3d4e5f6, a74e0a1d14bd, b2c3d4e5f6a7, b3c4d5e6f7a8, b6f06d66cf56, b9f7c1e4a2d3, c3d8e8b1a1f4, c4d5e6f7a8b9, ce6d9a2b5f01, cf35e1d6bba7, d0e1f2a3b4c5, d5e6f7a8b9c0, d5f6a7b8c9d0, d6e7f8a9b0c1, e1f2a3b4c5d6, e2f3a4b5c6d7, e7f8a9b0c1d2, f0e1d2c3b4a5, b0c1d2e3f4a5, f2a1c9e6d5b7, f4a5b6c7d8e9, f5a6b7c8d9e0, f6a7b8c9d0e1, f7a8b9c0d1e2, f8a9b0c1d2e3, f9b0c1d2e3f4
Create Date: 2026-06-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = (
    "1f9e6f1b92ab",
    "53da0533bbb2",
    "7a8b9c0d1e2f",
    "8b21f5c4aa11",
    "8b9c0d1e2f3a",
    "8d2574785b6c",
    "9f41de0d71c2",
    "a0b1c2d3e4f5",
    "a1b2c3d4e5f6",
    "a74e0a1d14bd",
    "b2c3d4e5f6a7",
    "b3c4d5e6f7a8",
    "b6f06d66cf56",
    "b9f7c1e4a2d3",
    "c3d8e8b1a1f4",
    "c4d5e6f7a8b9",
    "ce6d9a2b5f01",
    "cf35e1d6bba7",
    "d0e1f2a3b4c5",
    "d5e6f7a8b9c0",
    "d5f6a7b8c9d0",
    "d6e7f8a9b0c1",
    "e1f2a3b4c5d6",
    "e2f3a4b5c6d7",
    "e7f8a9b0c1d2",
    "f0e1d2c3b4a5",
    "b0c1d2e3f4a5",
    "f2a1c9e6d5b7",
    "f4a5b6c7d8e9",
    "f5a6b7c8d9e0",
    "f6a7b8c9d0e1",
    "f7a8b9c0d1e2",
    "f8a9b0c1d2e3",
    "f9b0c1d2e3f4",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("blocked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("blocked_reason", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("last_login_ip", sa.String(45), nullable=True))
    op.add_column("users", sa.Column("last_login_device", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_users_blocked_at"), "users", ["blocked_at"])

    op.create_table(
        "security_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("device", sa.String(255), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_security_logs_id"), "security_logs", ["id"])
    op.create_index(op.f("ix_security_logs_user_id"), "security_logs", ["user_id"])
    op.create_index(op.f("ix_security_logs_event_type"), "security_logs", ["event_type"])
    op.create_index(op.f("ix_security_logs_created_at"), "security_logs", ["created_at"])
    op.create_index("ix_security_logs_event_created", "security_logs", ["event_type", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_security_logs_event_created", table_name="security_logs")
    op.drop_index(op.f("ix_security_logs_created_at"), table_name="security_logs")
    op.drop_index(op.f("ix_security_logs_event_type"), table_name="security_logs")
    op.drop_index(op.f("ix_security_logs_user_id"), table_name="security_logs")
    op.drop_index(op.f("ix_security_logs_id"), table_name="security_logs")
    op.drop_table("security_logs")
    op.drop_index(op.f("ix_users_blocked_at"), table_name="users")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "last_login_device")
    op.drop_column("users", "last_login_ip")
    op.drop_column("users", "blocked_reason")
    op.drop_column("users", "blocked_at")
    op.drop_column("users", "failed_attempts")
