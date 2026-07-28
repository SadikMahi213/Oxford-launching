"""Add seller profile fields and status workflow

Revision ID: e7f8a9b0c1d2
Revises: d5f6a7b8c9d0
Create Date: 2026-06-09 06:30:00.000000

"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, None] = "d5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sellers", sa.Column("phone", sa.String(30), nullable=True))
    op.add_column("sellers", sa.Column("nid_number", sa.String(100), nullable=True))
    op.add_column("sellers", sa.Column("nid_front_image_key", sa.String(500), nullable=True))
    op.add_column("sellers", sa.Column("nid_back_image_key", sa.String(500), nullable=True))
    op.add_column("sellers", sa.Column("country", sa.String(100), nullable=True))
    op.add_column("sellers", sa.Column("division_state", sa.String(100), nullable=True))
    op.add_column("sellers", sa.Column("district_city", sa.String(100), nullable=True))
    op.add_column("sellers", sa.Column("full_address", sa.Text, nullable=True))
    op.add_column("sellers", sa.Column("store_logo_key", sa.String(500), nullable=True))
    op.add_column("sellers", sa.Column("store_banner_key", sa.String(500), nullable=True))
    op.add_column("sellers", sa.Column("facebook_url", sa.String(500), nullable=True))
    op.add_column("sellers", sa.Column("youtube_url", sa.String(500), nullable=True))
    op.add_column("sellers", sa.Column("tiktok_url", sa.String(500), nullable=True))
    op.add_column("sellers", sa.Column("website_url", sa.String(500), nullable=True))
    op.add_column("sellers", sa.Column("profile_completion", sa.Numeric(5, 2), nullable=True, server_default="0"))
    op.add_column("sellers", sa.Column("rejection_reason", sa.String(1000), nullable=True))
    op.add_column("sellers", sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("sellers", "status", server_default="draft")


def downgrade() -> None:
    op.drop_column("sellers", "phone")
    op.drop_column("sellers", "nid_number")
    op.drop_column("sellers", "nid_front_image_key")
    op.drop_column("sellers", "nid_back_image_key")
    op.drop_column("sellers", "country")
    op.drop_column("sellers", "division_state")
    op.drop_column("sellers", "district_city")
    op.drop_column("sellers", "full_address")
    op.drop_column("sellers", "store_logo_key")
    op.drop_column("sellers", "store_banner_key")
    op.drop_column("sellers", "facebook_url")
    op.drop_column("sellers", "youtube_url")
    op.drop_column("sellers", "tiktok_url")
    op.drop_column("sellers", "website_url")
    op.drop_column("sellers", "profile_completion")
    op.drop_column("sellers", "rejection_reason")
    op.drop_column("sellers", "submitted_at")
    op.alter_column("sellers", "status", server_default="approved")
