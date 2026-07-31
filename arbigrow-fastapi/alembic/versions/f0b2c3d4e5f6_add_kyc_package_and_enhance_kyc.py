"""Add KycPackage model and enhance KYC with package_id, txid, admin_note

Revision ID: f0b2c3d4e5f6
Revises: f0a1b2c3d4e5
Create Date: 2026-06-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "f0b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "kyc_packages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("price", sa.Numeric(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_kyc_packages_id"), "kyc_packages", ["id"])

    op.add_column("kyc_verifications",
                  sa.Column("kyc_package_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_kyc_kyc_package_id", "kyc_verifications",
                          "kyc_packages", ["kyc_package_id"], ["id"],
                          ondelete="SET NULL")

    op.add_column("kyc_verifications",
                  sa.Column("transaction_id", sa.String(length=255), nullable=True))

    op.execute("CREATE TYPE paymentstatus AS ENUM ('pending', 'paid')")
    op.add_column("kyc_verifications",
                  sa.Column("payment_status",
                            sa.Enum("pending", "paid", name="paymentstatus", create_type=False),
                            nullable=False,
                            server_default="pending"))

    op.add_column("kyc_verifications",
                  sa.Column("admin_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("kyc_verifications", "admin_note")

    op.execute("ALTER TABLE kyc_verifications ALTER COLUMN payment_status DROP DEFAULT")
    op.drop_column("kyc_verifications", "payment_status")
    op.execute("DROP TYPE IF EXISTS paymentstatus")

    op.drop_column("kyc_verifications", "transaction_id")

    op.drop_constraint("fk_kyc_kyc_package_id", "kyc_verifications", type_="foreignkey")
    op.drop_column("kyc_verifications", "kyc_package_id")

    op.drop_index(op.f("ix_kyc_packages_id"), table_name="kyc_packages")
    op.drop_table("kyc_packages")
