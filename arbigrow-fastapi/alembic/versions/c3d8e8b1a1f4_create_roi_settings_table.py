"""create roi settings table

Revision ID: c3d8e8b1a1f4
Revises: b9f7c1e4a2d3
Create Date: 2026-03-07 00:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3d8e8b1a1f4"
down_revision: Union[str, Sequence[str], None] = "b9f7c1e4a2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roi_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("roi_percent", sa.Numeric(precision=5, scale=2), server_default="3.00", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_roi_settings_id"), "roi_settings", ["id"], unique=False)
    op.create_index(op.f("ix_roi_settings_key"), "roi_settings", ["key"], unique=True)

    op.execute(
        sa.text(
            """
            INSERT INTO roi_settings (key, roi_percent)
            VALUES (:key, :roi_percent)
            """
        ).bindparams(
            key="global_daily_roi_percent",
            roi_percent=3.00,
        )
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_roi_settings_key"), table_name="roi_settings")
    op.drop_index(op.f("ix_roi_settings_id"), table_name="roi_settings")
    op.drop_table("roi_settings")
