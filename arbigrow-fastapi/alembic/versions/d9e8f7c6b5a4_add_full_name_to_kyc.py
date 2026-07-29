"""add full_name to kyc_verifications

Revision ID: d9e8f7c6b5a4
Revises: a3b4c5d6e7f8
Create Date: 2026-06-29 05:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd9e8f7c6b5a4'
down_revision: Union[str, Sequence[str], None] = 'a3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('kyc_verifications', sa.Column('full_name', sa.String(length=100), nullable=False, server_default=''))


def downgrade() -> None:
    op.drop_column('kyc_verifications', 'full_name')
