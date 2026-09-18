"""create deposit networks table

Revision ID: 7d4e635c4f1e
Revises: be9e44176206
Create Date: 2026-03-04 16:48:15.152371

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d4e635c4f1e'
down_revision: Union[str, Sequence[str], None] = 'be9e44176206'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "deposit_networks",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("network_name", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("wallet_address", sa.String(), nullable=False),
        sa.Column("status", sa.Boolean(), nullable=False,
                  server_default=sa.true()),
        sa.Column(
            "date_created",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("deposit_networks")
