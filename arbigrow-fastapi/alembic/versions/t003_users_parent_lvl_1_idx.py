"""Index users.parent_lvl_1_id for team-tree queries.

Revision ID: t003_users_parent_lvl_1_idx
Revises: t002_error_cycle
Create Date: 2026-09-12

Why: network-analytics, referral-network and level-analytics expand the team
via a recursive CTE on users.parent_lvl_1_id (anchor + every recursion level).
Without an index every level seq-scans users (~7k rows and growing), burning
PG CPU and holding pooled connections under concurrent load. Measured on
staging via EXPLAIN ANALYZE before applying.

Idempotent (IF NOT EXISTS): safe to run via `alembic upgrade head` or by
hand. Uses CONCURRENTLY so reads/writes are not blocked; therefore the
transaction is committed first (CONCURRENTLY cannot run inside one).

NOTE (deploy finding 2026-09-12): op.execute("COMMIT") alone may not escape
the transaction under this project's ASYNC alembic env (run_sync +
begin_transaction), in which case `alembic upgrade head` would fail with
"CREATE INDEX CONCURRENTLY cannot run inside a transaction block". The
staging/prod rollout applied the identical statement by hand and stamped the
version. If the alembic path is needed later, set AUTOCOMMIT isolation in
upgrade() (op.get_bind().execution_options(isolation_level="AUTOCOMMIT"))
and re-validate on staging first.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "t003_users_parent_lvl_1_idx"
down_revision: Union[str, Sequence[str], None] = "t002_error_cycle"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("COMMIT")
    op.execute(
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS "
        "ix_users_parent_lvl_1_id ON users (parent_lvl_1_id)"
    )


def downgrade() -> None:
    op.execute("COMMIT")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_users_parent_lvl_1_id")
