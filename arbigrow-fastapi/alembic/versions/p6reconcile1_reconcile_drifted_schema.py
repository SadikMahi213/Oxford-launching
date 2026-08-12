"""Reconcile drifted verif schema: add missing objects only (Phase 6)

The verif DB (arbigrow-verif:5434) was built via create_all + a partial
migration history, leaving several model-defined objects absent while some
later ones are present. This migration applies ONLY the genuinely-missing,
additive objects so the ORM models load without altering already-present
schema (no drops, no type changes, no NOT NULL changes).

Missing objects added here:
  - users.bonused_up_to (column + snapshot backfill)
  - delivery_zones table (+ FK to sellers)   [admin/seller delivery zones exist]
  - ix_matching_bonuses_is_reversed index    [is_reversed column already present]
  - wallet_audit_logs table

Revision ID: p6reconcile1
Revises: p4addlastactiveat1
Create Date: 2026-08-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "p6reconcile1"
down_revision: Union[str, list[str], None] = "p4addlastactiveat1"
branch_labels: str | None = None
depends_on: str | None = None


def _existing_columns(table: str, bind) -> set:
    return {c["name"] for c in inspect(bind).get_columns(table)}


def _table_exists(table: str, bind) -> bool:
    return table in inspect(bind).get_table_names()


def _index_exists(table: str, name: str, bind) -> bool:
    return any(i["name"] == name for i in inspect(bind).get_indexes(table))


def upgrade() -> None:
    bind = op.get_bind()

    # 1) users.bonused_up_to (the get_current_user blocker)
    if "bonused_up_to" not in _existing_columns("users", bind):
        op.add_column(
            "users",
            sa.Column(
                "bonused_up_to",
                sa.Numeric(24, 14),
                nullable=False,
                server_default="0",
            ),
        )
        op.execute(
            """
            UPDATE users
            SET bonused_up_to = COALESCE(kyc_approved_team_volume, 0)
            WHERE kyc_approved_at IS NOT NULL
            """
        )

    # 2) delivery_zones table (admin/seller delivery zones already present)
    if not _table_exists("delivery_zones", bind):
        op.create_table(
            "delivery_zones",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("seller_id", sa.Integer(), nullable=False, index=True),
            sa.Column("zone_name", sa.String(200), nullable=False),
            sa.Column(
                "delivery_charge",
                sa.Numeric(24, 14),
                nullable=False,
                server_default=sa.text("0"),
            ),
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_foreign_key(
            "fk_delivery_zones_seller_id",
            "delivery_zones",
            "sellers",
            ["seller_id"],
            ["id"],
        )

    # 3) ix_matching_bonuses_is_reversed (is_reversed column already exists)
    if not _index_exists(
        "matching_bonuses", "ix_matching_bonuses_is_reversed", bind
    ):
        op.create_index(
            "ix_matching_bonuses_is_reversed",
            "matching_bonuses",
            ["is_reversed"],
        )

    # 4) wallet_audit_logs table (no migration ever created it)
    if not _table_exists("wallet_audit_logs", bind):
        op.create_table(
            "wallet_audit_logs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False, index=True),
            sa.Column("admin_id", sa.Integer(), nullable=False),
            sa.Column("field_name", sa.String(50), nullable=False),
            sa.Column("old_value", sa.Numeric(24, 14), nullable=True),
            sa.Column("new_value", sa.Numeric(24, 14), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _table_exists("wallet_audit_logs", bind):
        op.drop_table("wallet_audit_logs")

    if _index_exists(
        "matching_bonuses", "ix_matching_bonuses_is_reversed", bind
    ):
        op.drop_index("ix_matching_bonuses_is_reversed", table_name="matching_bonuses")

    if _table_exists("delivery_zones", bind):
        op.drop_table("delivery_zones")

    if "bonused_up_to" in _existing_columns("users", bind):
        op.drop_column("users", "bonused_up_to")
