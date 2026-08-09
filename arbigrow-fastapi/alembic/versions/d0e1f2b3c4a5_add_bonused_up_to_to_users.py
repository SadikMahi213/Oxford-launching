"""Add bonused_up_to to users

Snapshot-in-band Matching Bonus fix: track the highest rank threshold that
matching bonus has already been paid up to, so pre-KYC (snapshot) volume is
never re-bonused and band deltas are exact.

Revision ID: d0e1f2b3c4a5
Revises: e5d4c3b2a1f1
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d0e1f2b3c4a5"
down_revision: str | None = "e5d4c3b2a1f1"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "bonused_up_to",
            sa.Numeric(24, 14),
            nullable=False,
            server_default="0",
        ),
    )

    # Backfill: for users whose KYC was ever approved, the permanent snapshot
    # volume (kyc_approved_team_volume) is exactly the volume that must never
    # generate a matching bonus again. Everyone else starts at 0.
    op.execute(
        """
        UPDATE users
        SET bonused_up_to = COALESCE(kyc_approved_team_volume, 0)
        WHERE kyc_approved_at IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_column("users", "bonused_up_to")
