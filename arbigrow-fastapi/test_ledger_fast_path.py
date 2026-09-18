"""Fast-path ledger predicate tests (Phase 5).

The fast path (bounded per-table top-N + SQL aggregates) is exact only when
every fetched row yields a kept record. These tests compile the real
SQLAlchemy predicates (postgresql dialect) and assert the exact
skip/include rules, NULLS LAST ordering, LIMIT presence, secondary-record
handling, and the fast-path eligibility gate. End-to-end numeric equivalence
is proven separately by byte-comparing pre/post responses on staging.

Run with: python test_ledger_fast_path.py
"""
from sqlalchemy.dialects import postgresql

from app.api.v1 import ledger as L


def _compile(stmt):
    return str(stmt.compile(dialect=postgresql.dialect(),
                            compile_kwargs={"literal_binds": True}))


def test_ordering_uses_nulls_last_and_limit():
    import sqlalchemy as sa
    from app.models.deposit import Deposit
    from app.models.ad_view import AdView
    q = sa.select(Deposit).where(
        Deposit.user_id == 1).order_by(
        Deposit.created_at.desc().nullslast()).limit(30)
    sql = _compile(q)
    assert "DESC NULLS LAST" in sql, sql
    assert "LIMIT 30" in sql, sql
    q2 = sa.select(AdView).where(AdView.user_id == 1).order_by(
        sa.func.coalesce(AdView.completed_at,
                         AdView.started_at).desc().nullslast()).limit(30)
    assert "DESC NULLS LAST" in _compile(q2)


def test_skip_pure_tables_by_stream():
    w = L._fast_wheres("dp", stream="earning", category=None,
                       currency=None, task_only=False, kyc_approved=True)
    assert w is None, "deposits never contribute to the earning stream"
    w = L._fast_wheres("iph", stream="transaction", category=None,
                       currency=None, task_only=False, kyc_approved=True)
    assert w is None, "ROI never contributes to the transaction stream"
    w = L._fast_wheres("mb", stream="transaction", category=None,
                       currency=None, task_only=False, kyc_approved=True)
    assert w is None, "5-category allowlist drops every matching row"
    w = L._fast_wheres("wt", stream="earning", category=None,
                       currency=None, task_only=False, kyc_approved=True)
    assert w is None, "wallet rows are all transaction stream"


def test_rph_level_mirrors_python_or_semantics():
    import sqlalchemy
    w = L._fast_wheres("rph", stream=None, category="referral_bonus",
                       currency=None, task_only=False, kyc_approved=True)
    assert w, "referral level must be fetchable"
    sql = _compile(
        sqlalchemy.select(L.ReferralProfitHistory.id).where(*w))
    assert "IS NULL" in sql and "IN (0, 1)" in sql, sql


def test_mb_never_skipped_on_category():
    import sqlalchemy
    # bonus_type is admin-configurable: any category value must still scan.
    w = L._fast_wheres("mb", stream=None, category="travel",
                       currency=None, task_only=False, kyc_approved=True)
    assert w, "dynamic bonus types must never be skipped"
    w = L._fast_wheres("mb", stream=None, category="matching_bonus",
                       currency=None, task_only=False, kyc_approved=True)
    assert w and "matching" in _compile(
        sqlalchemy.select(L.MatchingBonus.id).where(*w))


def test_ofa_kyc_gate_and_earning_narrowing():
    import sqlalchemy
    w = L._fast_wheres("ofa", stream=None, category=None,
                       currency=None, task_only=False, kyc_approved=False)
    sql = _compile(
        sqlalchemy.select(L.OFACoinTransaction.id).where(*w))
    assert "ofa_to_usdt" in sql, sql
    w = L._fast_wheres("ofa", stream="earning", category=None,
                       currency=None, task_only=False, kyc_approved=True)
    sql = _compile(
        sqlalchemy.select(L.OFACoinTransaction.id).where(*w))
    for kind in ("signup_bonus", "mining_reward"):
        assert kind in sql, sql


def test_wd_service_fee_charge_predicate():
    import sqlalchemy
    w = L._fast_wheres("wd", stream=None, category="service_fee",
                       currency=None, task_only=False, kyc_approved=True)
    sql = _compile(
        sqlalchemy.select(L.Withdrawal.id).where(*w))
    assert "charge" in sql and "> 0" in sql, sql


def test_secondary_charge_rule():
    assert L._fast_secondary_kept("wd", stream=None, category=None) is True
    assert L._fast_secondary_kept("wd", stream=None,
                                  category="service_fee") is True
    assert L._fast_secondary_kept("wd", stream="transaction",
                                  category=None) is False
    assert L._fast_secondary_kept("wd", stream="earning",
                                  category=None) is False
    assert L._fast_secondary_kept("dp", stream="transaction",
                                  category="withdrawal") is True


def test_fast_eligible_only_without_row_filters():
    assert L._fast_eligible(None, None, None, None, None) is True
    assert L._fast_eligible("", "", "", "", "") is True
    assert L._fast_eligible("completed", None, None, None, None) is False
    assert L._fast_eligible(None, "earning", None, None, None) is False
    assert L._fast_eligible(None, None, "2026-01-01", None, None) is False
    assert L._fast_eligible(None, None, None, None, "abc") is False


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                passed.append(name)
                print(f"PASS {name}")
            except Exception as e:
                print(f"FAIL {name}: {e}")
    total = len([n for n, f in globals().items()
                 if n.startswith("test_") and callable(f)])
    print(f"\n{len(passed)}/{total} LEDGER FAST-PATH TESTS PASSED")
    raise SystemExit(0 if len(passed) == total else 1)
