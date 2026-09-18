"""Convert stored presigned URLs to object keys for users and ads

Revision ID: f9f6a7b8c9d0
Revises: f9f5a6b7c8d9
Create Date: 2026-07-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f9f6a7b8c9d0"
down_revision: Union[str, None] = "f9f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE "users"
        SET profile_image_url = regexp_replace(
            profile_image_url,
            '^https://s3\\.us-east-005\\.backblazeb2\\.com/Oxford-ads/([^?]+)\\?.*$',
            '\\1'
        )
        WHERE profile_image_url ~ '^https://s3\\.us-east-005\\.backblazeb2\\.com/Oxford-ads/'
        """
    )
    op.execute(
        """
        UPDATE "ads"
        SET thumbnail = regexp_replace(
            thumbnail,
            '^https://s3\\.us-east-005\\.backblazeb2\\.com/Oxford-ads/([^?]+)\\?.*$',
            '\\1'
        )
        WHERE thumbnail ~ '^https://s3\\.us-east-005\\.backblazeb2\\.com/Oxford-ads/'
        """
    )


def downgrade() -> None:
    pass
