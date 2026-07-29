"""create visitor_logs table and merge heads

Revision ID: d0e1f2a3b4c5
Revises: 7a8b9c0d1e2f, f7a8b9c0d1e2, f9b0c1d2e3f4
Create Date: 2026-06-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = (
    "7a8b9c0d1e2f",
    "f7a8b9c0d1e2",
    "f9b0c1d2e3f4",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "visitor_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.String(64), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=False, server_default=""),
        sa.Column("device_type", sa.String(20), nullable=False, server_default="desktop"),
        sa.Column("os", sa.String(50), nullable=False, server_default=""),
        sa.Column("browser", sa.String(50), nullable=False, server_default=""),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("country_code", sa.String(5), nullable=True),
        sa.Column("traffic_source", sa.String(50), nullable=False, server_default="direct"),
        sa.Column("referrer_url", sa.Text(), nullable=True),
        sa.Column("page_url", sa.String(500), nullable=False, server_default=""),
        sa.Column("visited_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_visitor_logs_visited_at", "visitor_logs", ["visited_at"])
    op.create_index("ix_visitor_logs_ip_address", "visitor_logs", ["ip_address"])
    op.create_index("ix_visitor_logs_session_id", "visitor_logs", ["session_id"])
    op.create_index("ix_visitor_logs_traffic_source", "visitor_logs", ["traffic_source"])
    op.create_index("ix_visitor_logs_device_type", "visitor_logs", ["device_type"])


def downgrade() -> None:
    op.drop_table("visitor_logs")
