"""remove unique constraint from sellers.user_id

Revision ID: 8b9c0d1e2f3a
Revises: 8b21f5c4aa11
Create Date: 2026-06-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8b9c0d1e2f3a"
down_revision: Union[str, Sequence[str], None] = "8b21f5c4aa11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("sellers_user_id_key", "sellers", type_="unique")
    op.create_index(op.f("ix_sellers_user_id"), "sellers", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_sellers_user_id"), table_name="sellers")
    op.create_unique_constraint("sellers_user_id_key", "sellers", ["user_id"])
