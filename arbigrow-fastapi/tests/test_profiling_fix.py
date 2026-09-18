"""Profiling fix: team-tree index + early session release.

Covers Phase 4 for the 1000-VU bottleneck remediation:
- users.parent_lvl_1_id (the recursive-CTE join column used by
  network-analytics / referral-network / level-analytics) is indexed in the
  model metadata
- migration t003 creates that index concurrently + idempotently on top of
  the t002_error_cycle head
- network-analytics and ledger/transactions release the pooled connection
  before serialization (same established pattern as referral-network and
  level-analytics), without touching response semantics

No real database is touched.
"""
import inspect
import os

from app.api.v1 import ledger as ledger_mod
from app.api.v1 import user_network as net_mod
from app.models.user import User


def test_parent_lvl_1_indexed_in_model():
    col = User.__table__.c.parent_lvl_1_id
    assert col.index is True


def test_migration_exists_with_correct_head_and_concurrency():
    path = os.path.join(
        os.path.dirname(__file__), "..", "alembic", "versions",
        "t003_users_parent_lvl_1_idx.py",
    )
    assert os.path.exists(path)
    with open(path) as f:
        src = f.read()
    assert 'down_revision' in src and 't002_error_cycle' in src
    assert "CONCURRENTLY" in src
    assert "IF NOT EXISTS" in src
    assert "ix_users_parent_lvl_1_id" in src


def test_network_analytics_releases_session_before_return():
    src = inspect.getsource(net_mod.get_network_analytics)
    assert "await db.close()" in src
    assert src.index("await db.close()") < src.rindex("return")


def test_ledger_transactions_releases_session_before_return():
    src = inspect.getsource(ledger_mod.get_ledger_transactions)
    assert "await db.close()" in src
    assert src.index("await db.close()") < src.rindex("return")


def test_no_business_logic_markers_changed():
    # Close/index only: no stream reclassification, no retention change,
    # no balance/category computation change.
    assert ledger_mod.RETENTION_DAYS == 30
    assert "deposit" in ledger_mod.TRANSACTION_STREAM_CATEGORIES
    assert "captcha" in ledger_mod.EARNING_STREAM_CATEGORIES
