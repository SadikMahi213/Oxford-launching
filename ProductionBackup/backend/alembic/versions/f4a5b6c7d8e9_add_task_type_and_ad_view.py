"""add task_type to packages + ad_views table

Revision ID: f4a5b6c7d8e9
Revises: e2f3a4b5c6d7
Create Date: 2026-06-13 17:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f4a5b6c7d8e9"
down_revision: Union[str, None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE task_type_enum AS ENUM ('captcha', 'ad_view')")
    op.create_table(
        "ad_views",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("is_completed", sa.Boolean(), default=False),
        sa.Column("amount_earned", sa.Numeric(24, 14), server_default="0"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column("packages", sa.Column("task_type", sa.Enum("captcha", "ad_view", name="task_type_enum", create_type=False), server_default="captcha", nullable=True))
    op.add_column("packages", sa.Column("ad_duration_seconds", sa.Integer(), server_default="30", nullable=True))


def downgrade() -> None:
    op.drop_table("ad_views")
    op.drop_column("packages", "task_type")
    op.drop_column("packages", "ad_duration_seconds")
    op.execute("DROP TYPE IF EXISTS task_type_enum CASCADE")
