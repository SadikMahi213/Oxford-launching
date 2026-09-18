"""create invoice table

Revision ID: ce6d9a2b5f01
Revises: cf35e1d6bba7
Create Date: 2025-06-01 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ce6d9a2b5f01"
down_revision: Union[str, None] = "cf35e1d6bba7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("invoice_type", sa.String(50), nullable=False),
        sa.Column("invoice_number", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("amount", sa.Numeric(24, 14), nullable=True),
        sa.Column("currency", sa.String(10), server_default="USDT"),
        sa.Column("status", sa.String(20), server_default="generated"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("pdf_url", sa.String(500), nullable=True),
        sa.Column("pdf_storage_key", sa.String(255), nullable=True),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("emailed", sa.String(20), server_default="no"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoices_id"), "invoices", ["id"])
    op.create_index(op.f("ix_invoices_user_id"), "invoices", ["user_id"])


def downgrade() -> None:
    op.drop_table("invoices")
