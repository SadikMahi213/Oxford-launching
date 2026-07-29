"""Regenerate user_no as random 11-digit values

Revision ID: e5d4c3b2a1f0
Revises: f0c1d2e3f4a7
Create Date: 2026-07-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5d4c3b2a1f0"
down_revision: Union[str, None] = "f0c1d2e3f4a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Generate random unique 11-digit user_no for every user
    conn.execute(
        sa.text("""
            DO $$
            DECLARE
                r record;
                new_no text;
            BEGIN
                FOR r IN SELECT id FROM users ORDER BY id LOOP
                    LOOP
                        new_no := (FLOOR(RANDOM() * 90000000000) + 10000000000)::bigint::text;
                        BEGIN
                            UPDATE users SET user_no = new_no WHERE id = r.id;
                            EXIT;
                        EXCEPTION WHEN unique_violation THEN
                            -- retry with a new random number
                        END;
                    END LOOP;
                END LOOP;
            END $$;
        """)
    )


def downgrade() -> None:
    pass
