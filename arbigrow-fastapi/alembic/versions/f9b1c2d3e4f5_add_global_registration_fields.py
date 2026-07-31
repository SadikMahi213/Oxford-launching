"""add_global_registration_fields

Revision ID: f9b1c2d3e4f5
Revises: f9b0c1d2e3f4
Create Date: 2026-06-21 09:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "f9b1c2d3e4f5"
down_revision: str | None = "f9b0c1d2e3f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("gender", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("nationality", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("country_of_residence", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("mobile_number", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("residential_address", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("state_province", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("postal_code", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("national_id_number", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("passport_number", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "passport_number")
    op.drop_column("users", "national_id_number")
    op.drop_column("users", "postal_code")
    op.drop_column("users", "state_province")
    op.drop_column("users", "city")
    op.drop_column("users", "residential_address")
    op.drop_column("users", "mobile_number")
    op.drop_column("users", "country_of_residence")
    op.drop_column("users", "nationality")
    op.drop_column("users", "gender")
    op.drop_column("users", "date_of_birth")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
