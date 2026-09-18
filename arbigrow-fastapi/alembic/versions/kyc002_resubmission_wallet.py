"""Add separate admin KYC resubmission wallet accounting fields.

Revision ID: kyc002_resubmission_wallet
Revises: uap001_add_user_approval_status
Create Date: 2026-09-18

- company_wallet.total_kyc_resubmission_collected: accumulates ONLY fees
  from KYC resubmissions (after rejection+refund), separate from the
  existing total_kyc_collected (first-submission revenue, unchanged).
- kyc_verifications.submission_count: 1 for first submissions, incremented
  on each fee-bearing resubmission so admin accounting can separate
  first-submission revenue from resubmission revenue. Existing rows are
  all first submissions -> backfilled to 1 (no retroactive moves).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "kyc002_resubmission_wallet"
down_revision: Union[str, Sequence[str], None] = "uap001_add_user_approval_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "company_wallet",
        sa.Column(
            "total_kyc_resubmission_collected",
            sa.Numeric(precision=24, scale=14),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "kyc_verifications",
        sa.Column(
            "submission_count",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )
    # All pre-existing rows are first submissions.
    op.execute("UPDATE kyc_verifications SET submission_count=1 WHERE submission_count IS NULL OR submission_count < 1")


def downgrade() -> None:
    op.drop_column("kyc_verifications", "submission_count")
    op.drop_column("company_wallet", "total_kyc_resubmission_collected")
