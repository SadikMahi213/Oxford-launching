"""Bonus Ledger rank-achievement detail (Phase 7).

Verifies list_all_matching_bonuses exposes full rank-achievement detail
from already-joined rows (single query, no N+1):
  user identity, source identity, rank name + required volume, bonus,
  reference, status, timestamps. Non-rank entries keep their shape.
"""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal


class _Person:
    def __init__(self, *, user_no="U1", full_name="John", username="john",
                 email="john@e.com"):
        self.user_no = user_no
        self.full_name = full_name
        self.username = username
        self.email = email


class _Rank:
    def __init__(self, *, name="Gold", target_volume=Decimal("1000")):
        self.name = name
        self.target_volume = target_volume


class _Bonus:
    def __init__(self, *, source=None, rank=None):
        self.id = 7
        self.user_id = 123
        self.user = _Person()
        self.source_user_id = 45
        self.source_user = source
        self.rank_id = 3
        self.rank = rank
        self.bonus_type = "matching"
        self.eligible_amount = Decimal("500")
        self.bonus_percent = Decimal("8")
        self.bonus_amount = Decimal("40")
        self.reference_id = 123456
        self.reference_type = "deposit"
        self.description = "matching bonus for Gold"
        self.is_reversed = False
        self.created_at = datetime(2026, 9, 18, 10, 42, 15, tzinfo=timezone.utc)


class _Row:
    def __init__(self, val):
        self.val = val

    def scalars(self):
        class _S:
            def __init__(self, v):
                self.v = v

            def all(inner):
                return self.val

        return _S(self.val)


class _DB:
    def __init__(self, rows):
        self.rows = rows
        self.calls = []

    async def execute(self, stmt):
        self.calls.append(str(stmt))
        return _Row(self.rows)


def _fetch(db, **kw):
    from app.api.v1.admin_ranks import list_all_matching_bonuses

    async def run():
        # page/limit passed explicitly: direct calls bypass FastAPI's
        # Query() default injection.
        return await list_all_matching_bonuses(page=1, limit=50, db=db,
                                               admin=None, **kw)

    return asyncio.run(run())


class TestBonusLedgerDetails:
    def test_rank_achievement_identifiable(self):
        db = _DB([_Bonus(source=_Person(user_no="U45", full_name="Src",
                                        username="src", email="s@e.com"),
                          rank=_Rank())])
        rows = _fetch(db)
        assert len(rows) == 1
        b = rows[0]
        assert b["user_full_name"] == "John"
        assert b["user_username"] == "john"
        assert b["user_email"] == "john@e.com"
        assert b["user_no"] == "U1"
        assert b["user_id"] == 123
        assert b["rank_name"] == "Gold"
        assert b["rank_id"] == 3
        assert b["rank_target_volume"] == "1000"
        assert b["bonus_amount"] == "40"
        assert b["bonus_percent"] == "8"
        assert b["eligible_amount"] == "500"
        assert b["reference_id"] == 123456
        assert b["reference_type"] == "deposit"
        assert b["status"] == "completed"
        assert b["created_at"].startswith("2026-09-18")

    def test_missing_relations_render_none_not_crash(self):
        db = _DB([_Bonus(source=None, rank=None)])
        b = _fetch(db)[0]
        assert b["source_user_no"] is None
        assert b["source_full_name"] is None
        assert b["rank_name"] is None
        assert b["rank_target_volume"] is None
        assert b["user_full_name"] == "John"

    def test_single_query_no_n_plus_one(self):
        db = _DB([_Bonus(source=_Person(), rank=_Rank()) for _ in range(5)])
        rows = _fetch(db)
        assert len(rows) == 5
        assert len(db.calls) == 1, "ledger must load in one query (joinedload)"

    def test_existing_shape_preserved(self):
        db = _DB([_Bonus(source=_Person(), rank=_Rank())])
        b = _fetch(db)[0]
        for key in ("id", "user_id", "user_no", "source_user_id",
                    "source_user_no", "rank_id", "bonus_type",
                    "eligible_amount", "bonus_percent", "bonus_amount",
                    "reference_id", "reference_type", "description",
                    "created_at"):
            assert key in b, f"existing key {key} must remain"
