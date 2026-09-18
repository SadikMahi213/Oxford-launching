"""add youtube ads tables (ad, user_ad_view) + ad_id to ad_views

Revision ID: f5a6b7c8d9e0
Revises: f4a5b6c7d8e9
Create Date: 2026-06-14 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, None] = "f4a5b6c7d8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ads table
    op.create_table(
        "ads",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("youtube_url", sa.String(length=500), nullable=False),
        sa.Column("video_id", sa.String(length=50), nullable=False),
        sa.Column("thumbnail", sa.String(length=500), nullable=True),
        sa.Column("required_watch_seconds", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ads_video_id"), "ads", ["video_id"])

    # Create user_ad_views table
    op.create_table(
        "user_ad_views",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("ad_id", sa.Integer(), nullable=False),
        sa.Column("view_count", sa.Integer(), nullable=True),
        sa.Column("total_rewarded", sa.Numeric(24, 14), server_default="0", nullable=True),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ad_id"], ["ads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "ad_id", name="uq_user_ad"),
    )
    op.create_index(op.f("ix_user_ad_views_user_id"), "user_ad_views", ["user_id"])
    op.create_index(op.f("ix_user_ad_views_ad_id"), "user_ad_views", ["ad_id"])

    # Add ad_id column to ad_views table
    op.add_column("ad_views", sa.Column("ad_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_ad_views_ad_id"), "ad_views", ["ad_id"])
    op.create_foreign_key("fk_ad_views_ad_id", "ad_views", "ads", ["ad_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    # Remove ad_id from ad_views
    op.drop_constraint("fk_ad_views_ad_id", "ad_views", type_="foreignkey")
    op.drop_index(op.f("ix_ad_views_ad_id"), table_name="ad_views")
    op.drop_column("ad_views", "ad_id")

    # Drop user_ad_views table
    op.drop_index(op.f("ix_user_ad_views_ad_id"), table_name="user_ad_views")
    op.drop_index(op.f("ix_user_ad_views_user_id"), table_name="user_ad_views")
    op.drop_table("user_ad_views")

    # Drop ads table
    op.drop_index(op.f("ix_ads_video_id"), table_name="ads")
    op.drop_table("ads")
