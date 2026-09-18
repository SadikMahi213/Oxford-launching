"""Add matching bonus system (ranks, rank_history, matching_bonuses, user fields)

Revision ID: f9e4f5a6b7c8
Revises: f9d3e4f5a6b7
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f9e4f5a6b7c8"
down_revision: Union[str, None] = "f9d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ranks table
    op.create_table(
        "ranks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("target_volume", sa.Numeric(24, 14), nullable=False, server_default="0"),
        sa.Column("matching_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("extra_bonus_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("travel_bonus_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("company_profit_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("development_bonus_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("international_bonus_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("position_bonus_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("max_matching_percent", sa.Numeric(8, 4), nullable=False, server_default="100"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_ranks_id"), "ranks", ["id"])
    op.create_index(op.f("ix_ranks_slug"), "ranks", ["slug"])
    op.create_index(op.f("ix_ranks_sort_order"), "ranks", ["sort_order"])

    # Create rank_histories table
    op.create_table(
        "rank_histories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rank_id", sa.Integer(), sa.ForeignKey("ranks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("previous_rank_id", sa.Integer(), sa.ForeignKey("ranks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("team_volume", sa.Numeric(24, 14), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="achieved"),
        sa.Column(
            "achieved_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_rank_histories_id"), "rank_histories", ["id"])
    op.create_index(op.f("ix_rank_histories_user_id"), "rank_histories", ["user_id"])
    op.create_index(op.f("ix_rank_histories_rank_id"), "rank_histories", ["rank_id"])

    # Create matching_bonuses table
    op.create_table(
        "matching_bonuses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("rank_id", sa.Integer(), sa.ForeignKey("ranks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bonus_type", sa.String(50), nullable=False),
        sa.Column("eligible_amount", sa.Numeric(24, 14), nullable=False, server_default="0"),
        sa.Column("bonus_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("bonus_amount", sa.Numeric(24, 14), nullable=False, server_default="0"),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_matching_bonuses_id"), "matching_bonuses", ["id"])
    op.create_index(op.f("ix_matching_bonuses_user_id"), "matching_bonuses", ["user_id"])
    op.create_index(op.f("ix_matching_bonuses_source_user_id"), "matching_bonuses", ["source_user_id"])
    op.create_index(op.f("ix_matching_bonuses_rank_id"), "matching_bonuses", ["rank_id"])
    op.create_index(op.f("ix_matching_bonuses_bonus_type"), "matching_bonuses", ["bonus_type"])
    op.create_index(op.f("ix_matching_bonuses_reference_id"), "matching_bonuses", ["reference_id"])
    op.create_index(op.f("ix_matching_bonuses_created_at"), "matching_bonuses", ["created_at"])

    # Add columns to users table
    op.add_column(
        "users",
        sa.Column("current_rank_id", sa.Integer(), sa.ForeignKey("ranks.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index(op.f("ix_users_current_rank_id"), "users", ["current_rank_id"])
    op.add_column(
        "users",
        sa.Column("team_volume", sa.Numeric(24, 14), nullable=True, server_default="0"),
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_current_rank_id"), table_name="users")
    op.drop_column("users", "current_rank_id")
    op.drop_column("users", "team_volume")
    op.drop_index(op.f("ix_matching_bonuses_created_at"), table_name="matching_bonuses")
    op.drop_index(op.f("ix_matching_bonuses_reference_id"), table_name="matching_bonuses")
    op.drop_index(op.f("ix_matching_bonuses_bonus_type"), table_name="matching_bonuses")
    op.drop_index(op.f("ix_matching_bonuses_rank_id"), table_name="matching_bonuses")
    op.drop_index(op.f("ix_matching_bonuses_source_user_id"), table_name="matching_bonuses")
    op.drop_index(op.f("ix_matching_bonuses_user_id"), table_name="matching_bonuses")
    op.drop_index(op.f("ix_matching_bonuses_id"), table_name="matching_bonuses")
    op.drop_table("matching_bonuses")
    op.drop_index(op.f("ix_rank_histories_rank_id"), table_name="rank_histories")
    op.drop_index(op.f("ix_rank_histories_user_id"), table_name="rank_histories")
    op.drop_index(op.f("ix_rank_histories_id"), table_name="rank_histories")
    op.drop_table("rank_histories")
    op.drop_index(op.f("ix_ranks_sort_order"), table_name="ranks")
    op.drop_index(op.f("ix_ranks_slug"), table_name="ranks")
    op.drop_index(op.f("ix_ranks_id"), table_name="ranks")
    op.drop_table("ranks")
