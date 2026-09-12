"""30-day History/Transaction retention window (user-facing, non-destructive).

Covers Phase 3/4/6 (retention):
- 29-day-old record appears; exactly-30-day boundary record appears (>=);
  older-than-30-day record is excluded
- the same cutoff applies to BOTH streams (earning_history and
  transaction_history share one helper + one call site)
- records without a parseable date are kept (fail-open: never hide money)
- no destructive deletion exists in the ledger path; category totals stay
  lifetime (no date filter in _category_summary); balances untouched

No real database is touched.
"""
import inspect
from datetime import datetime, timedelta, timezone

from app.api.v1 import ledger as ledger_mod
from app.api.v1.ledger import (
    RETENTION_DAYS,
    apply_retention_window,
    retention_cutoff_utc,
)


def _rec(days_ago, stream="earning", now=None):
    now = now or datetime.now(timezone.utc)
    return {
        "id": f"t:{days_ago}:{stream}",
        "date": (now - timedelta(days=days_ago)).isoformat(),
        "stream": stream,
    }


def test_retention_window_is_30_days():
    assert RETENTION_DAYS == 30
    now = datetime.now(timezone.utc)
    assert retention_cutoff_utc(now) == now - timedelta(days=30)


def test_29_day_old_record_appears():
    assert apply_retention_window([_rec(29)]) != []


def test_30_day_boundary_record_appears():
    now = datetime.now(timezone.utc)
    rec = _rec(30, now=now)
    assert apply_retention_window([rec], now) == [rec]


def test_older_than_30_day_record_excluded():
    assert apply_retention_window([_rec(31)]) == []


def test_same_cutoff_for_both_streams():
    now = datetime.now(timezone.utc)
    records = [
        _rec(10, "earning", now),
        _rec(10, "transaction", now),
        _rec(45, "earning", now),
        _rec(45, "transaction", now),
    ]
    kept = apply_retention_window(records, now)
    assert sorted(r["id"] for r in kept) == ["t:10:earning", "t:10:transaction"]


def test_missing_or_bad_date_is_kept_fail_open():
    records = [{"id": "a", "date": None}, {"id": "b"}, {"id": "c", "date": "not-a-date"}]
    assert len(apply_retention_window(records)) == 3


def test_naive_date_treated_as_utc():
    now = datetime.now(timezone.utc)
    rec = {"id": "n", "date": (now - timedelta(days=5)).replace(tzinfo=None).isoformat()}
    assert apply_retention_window([rec], now) == [rec]


def test_endpoint_applies_window_before_pagination():
    src = inspect.getsource(ledger_mod.get_ledger_transactions)
    assert "apply_retention_window" in src
    assert src.index("apply_retention_window") < src.index("Pagination")


def test_category_totals_stay_lifetime():
    src = inspect.getsource(ledger_mod._category_summary)
    assert "created_at" not in src
    assert "retention" not in src.lower()


def test_no_destructive_deletion_in_ledger():
    src = inspect.getsource(ledger_mod)
    assert ".delete(" not in src
    assert "DELETE" not in src
