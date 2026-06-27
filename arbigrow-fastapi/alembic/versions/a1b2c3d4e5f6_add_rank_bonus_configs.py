"""Add rank_bonus_configs table and migrate bonus columns

Revision ID: a1b2c3d4e5f6
Revises: f9e4f5a6b7c8
Create Date: 2026-06-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f9e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BONUS_COLUMNS = [
    "matching_percent",
    "extra_bonus_percent",
    "travel_bonus_percent",
    "company_profit_percent",
    "development_bonus_percent",
    "international_bonus_percent",
    "position_bonus_percent",
]


def upgrade() -> None:
    # Create rank_bonus_configs table
    op.create_table(
        "rank_bonus_configs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("rank_id", sa.Integer(), nullable=False, index=True),
        sa.Column("bonus_type", sa.String(50), nullable=False),
        sa.Column("bonus_percent", sa.Numeric(8, 4), nullable=False, server_default="0"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["rank_id"], ["ranks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # Migrate existing bonus data from ranks columns to rank_bonus_configs
    conn = op.get_bind()
    ranks = conn.execute(sa.text("SELECT id, matching_percent, extra_bonus_percent, travel_bonus_percent, company_profit_percent, development_bonus_percent, international_bonus_percent, position_bonus_percent FROM ranks")).fetchall()

    for row in ranks:
        rank_id = row[0]
        values = row[1:]
        for idx, (col, val) in enumerate(zip(BONUS_COLUMNS, values)):
            pct = float(val) if val is not None else 0
            if pct > 0:
                conn.execute(
                    sa.text(
                        "INSERT INTO rank_bonus_configs (rank_id, bonus_type, bonus_percent, sort_order) VALUES (:rank_id, :bonus_type, :bonus_percent, :sort_order)"
                    ),
                    {
                        "rank_id": rank_id,
                        "bonus_type": col.replace("_percent", ""),
                        "bonus_percent": str(pct),
                        "sort_order": idx,
                    },
                )

    # Drop bonus columns from ranks table
    for col in BONUS_COLUMNS:
        op.drop_column("ranks", col)


def downgrade() -> None:
    # Re-add bonus columns to ranks table
    for col in BONUS_COLUMNS:
        op.add_column(
            "ranks",
            sa.Column(col, sa.Numeric(8, 4), nullable=False, server_default="0"),
        )

    # Migrate data back from rank_bonus_configs to ranks columns
    conn = op.get_bind()
    configs = conn.execute(
        sa.text("SELECT rank_id, bonus_type, bonus_percent FROM rank_bonus_configs ORDER BY rank_id, sort_order")
    ).fetchall()

    current_rank_id = None
    update_data = {}
    for rank_id, bonus_type, bonus_percent in configs:
        if rank_id != current_rank_id and current_rank_id is not None:
            cols = ", ".join(f"{k}_percent = :{k}" for k in update_data)
            params = {k: str(v) for k, v in update_data.items()}
            params["rid"] = current_rank_id
            if cols:
                conn.execute(
                    sa.text(f"UPDATE ranks SET {cols} WHERE id = :rid"),
                    params,
                )
            update_data = {}
        current_rank_id = rank_id
        bonus_col = f"{bonus_type}_percent"
        update_data[bonus_type] = bonus_percent

    if current_rank_id is not None and update_data:
        cols = ", ".join(f"{k}_percent = :{k}" for k in update_data)
        params = {k: str(v) for k, v in update_data.items()}
        params["rid"] = current_rank_id
        if cols:
            conn.execute(
                sa.text(f"UPDATE ranks SET {cols} WHERE id = :rid"),
                params,
            )

    # Drop rank_bonus_configs table
    op.drop_table("rank_bonus_configs")
