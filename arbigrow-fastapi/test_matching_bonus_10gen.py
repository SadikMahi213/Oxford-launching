"""Regression tests: Matching Bonus is limited to the first 10 generations.

Business rule (strict production change):
  * Team Volume for rank qualification stays at 40 generations (UNCHANGED).
  * Matching Bonus only considers the first 10 generations. Descendants in
    generations 11-40 must never drive a matching-bonus payout.

Run with: python test_matching_bonus_10gen.py
"""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

WALLET_PRECISION = Decimal("0.00000000000001")


class _Row:
    def __init__(self, val=None, items=None):
        self.val = val
        self._items = items or []

    class _Scalars:
        def __init__(self, items):
            self._items = items

        def all(self):
            return list(self._items)

    def scalar_one_or_none(self):
        return self.val

    def scalar(self):
        return self.val

    def first(self):
        return self.val

    def fetchall(self):
        return list(self._items)

    def scalars(self):
        return _Row._Scalars(self._items)


class _Rank:
    def __init__(self, rid, name, target, sort_order=None):
        self.id = rid
        self.name = name
        self.slug = f"r{rid}"
        self.sort_order = sort_order if sort_order is not None else rid
        self.target_volume = Decimal(target)
        self.max_matching_percent = Decimal("100")
        self.is_active = True
        self.description = None
        self.bonus_configs = []
        self.created_at = None
        self.updated_at = None


class _Config:
    def __init__(self, bid, rank_id, bonus_type, percent, sort_order=1):
        self.id = bid
        self.rank_id = rank_id
        self.bonus_type = bonus_type
        self.bonus_percent = Decimal(percent)
        self.sort_order = sort_order


class _Bonus:
    def __init__(self, bid, rank_id, is_reversed=False):
        self.id = bid
        self.user_id = 1
        self.rank_id = rank_id
        self.bonus_type = "matching"
        self.eligible_amount = Decimal("0")
        self.bonus_percent = Decimal("10")
        self.bonus_amount = Decimal("0")
        self.is_reversed = is_reversed
        self.reversed_at = None
        self.reversal_reason = None


class _User:
    def __init__(self, user_id=1, rank_id=None):
        self.id = user_id
        self.current_rank_id = rank_id
        self.team_volume = Decimal("0")
        self.matching_bonus_wallet = Decimal("0")
        self.kyc_approved_at = None
        self.user_no = f"U{user_id}"


class _EvalDB:
    """Fake DB that serves Rank, RankBonusConfig and MatchingBonus lookups."""

    def __init__(self, user, ranks, configs, bonus_rows=None):
        self.user = user
        self.ranks = {r.id: r for r in ranks}
        self.configs = configs
        self.bonus_rows = bonus_rows or []
        self.rank_query_text = None

    async def execute(self, stmt, params=None):
        text = str(stmt)
        if "matching_bonuses" in text:
            return _Row(self.bonus_rows[0] if self.bonus_rows else None, self.bonus_rows)
        if "rank_bonus_configs" in text:
            return _Row(None, self.configs)
        if "ranks" in text and "sort_order" in text:
            self.rank_query_text = text
            # Highest active rank with target_volume <= params "volume" handled by
            # patched _get_highest_qualified_rank, so serve all active ranks here.
            return _Row(None, [r for r in self.ranks.values() if r.is_active])
        return _Row(self.user)

    async def get(self, cls, obj_id):
        if cls.__name__ == "Rank":
            return self.ranks.get(obj_id)
        if cls.__name__ == "User":
            return self.user
        return None

    def add(self, *_a, **_k):
        return None

    async def commit(self):
        return None

    async def refresh(self, *_a, **_k):
        return None


# --- Depth verification -----------------------------------------------------


class _VolDB:
    def __init__(self, self_sum, desc_rows, team_sum):
        self._queue = [self_sum, team_sum]
        self._desc_rows = desc_rows
        self.calls = []

    async def execute(self, stmt, params=None):
        self.calls.append((str(stmt), params))
        if not getattr(stmt, "column_descriptions", None):
            return _Row(None, self._desc_rows)
        return _Row(self._queue.pop(0))

    async def get(self, *_a, **_k):
        return None


def _run_volume(depth, self_sum=Decimal("500"), desc_rows=None, team_sum=Decimal("1")):
    import app.services.rank_service as rs
    db = _VolDB(self_sum, desc_rows or [(2,)], team_sum)

    async def run():
        if depth == 40:
            return await rs.get_team_volume(1, db)
        return await rs.get_matching_bonus_volume(1, db)

    return asyncio.run(run()), db


def test_team_volume_still_capped_at_40_generations():
    _, db = _run_volume(40)
    cte_stmt, params = db.calls[1]
    assert params["max_depth"] == 40, "Team Volume recursion must stay at 40 generations"


def test_matching_bonus_volume_capped_at_10_generations():
    _, db = _run_volume(10)
    cte_stmt, params = db.calls[1]
    assert params["max_depth"] == 10, "Matching Bonus volume must cap at 10 generations"


def test_matching_volume_includes_self_deposit():
    (personal, matching), _ = _run_volume(10, self_sum=Decimal("500"),
                                          desc_rows=[(2,)], team_sum=Decimal("700"))
    assert personal == Decimal("500")
    assert matching == Decimal("1200"), "Matching volume must include own deposit + first 10 gens"


def test_default_team_volume_max_depth_is_40():
    import inspect
    import app.services.rank_service as rs
    sig = inspect.signature(rs.get_team_volume)
    assert sig.parameters["max_depth"].default == 40, (
        "default team volume depth must remain 40 so existing callers are unchanged"
    )


def test_matching_depth_constant_is_10():
    import app.services.rank_service as rs
    assert rs.MATCHING_BONUS_MAX_DEPTH == 10
    assert rs.TEAM_VOLUME_MAX_DEPTH == 40


# --- Rank qualification stays 40-gen, bonus payout capped at 10-gen ---------


def _eval(user, *, team_volume, matching_volume, ranks, configs, kyc_approved=True,
          skip_bonus=False, snapshot=False, snapshot_volume=None):
    db = _EvalDB(user, ranks, configs)

    async def run():
        import app.services.rank_service as rs

        async def highest(volume, _db):
            qual = [r for r in ranks if r.is_active and r.target_volume <= volume]
            if not qual:
                return None
            return max(qual, key=lambda r: r.sort_order)

        with patch("app.services.rank_service.is_kyc_approved",
                   AsyncMock(return_value=kyc_approved)), patch(
            "app.services.rank_service.get_team_volume",
            AsyncMock(return_value=(Decimal("500"), team_volume)),
        ), patch(
            "app.services.rank_service.get_matching_bonus_volume",
            AsyncMock(return_value=(Decimal("500"), matching_volume)),
        ), patch(
            "app.services.rank_service._get_highest_qualified_rank", highest
        ):
            return await rs.evaluate_and_process_rank(
                user_id=user.id, db=db, skip_bonus=skip_bonus,
                use_snapshot_volume=snapshot, snapshot_volume=snapshot_volume,
            )

    return asyncio.run(run()), db, user


def test_bonus_paid_only_within_10_gen_rank_cap():
    """40-gen volume reaches rank 4, but 10-gen volume only reaches rank 2:
    rank qualification upgrades to rank 4, yet only ranks <= 2 pay a bonus."""
    ranks = [
        _Rank(1, "Rank 1", "1000", sort_order=1),
        _Rank(2, "Rank 2", "2000", sort_order=2),
        _Rank(3, "Rank 3", "4000", sort_order=3),
        _Rank(4, "Rank 4", "8000", sort_order=4),
    ]
    configs = [_Config(10, 1, "matching", "10"), _Config(11, 2, "matching", "10"),
               _Config(12, 3, "matching", "10"), _Config(13, 4, "matching", "10")]
    user = _User(1)
    result, db, user = _eval(
        user, team_volume=Decimal("8000"), matching_volume=Decimal("2000"),
        ranks=ranks, configs=configs,
    )
    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 4, "rank qualification must stay 40-gen (reaches rank 4)"
    paid = result["bonuses_paid"]
    assert {p["rank_id"] for p in paid} == {1, 2}, (
        "bonus must be capped at the 10-gen rank (rank 2), not the 40-gen rank (rank 4)"
    )


def test_bonus_paid_full_when_10_gen_supports_all_ranks():
    ranks = [
        _Rank(1, "Rank 1", "1000", sort_order=1),
        _Rank(2, "Rank 2", "2000", sort_order=2),
    ]
    configs = [_Config(20, 1, "matching", "10"), _Config(21, 2, "matching", "10")]
    user = _User(1)
    result, _, _ = _eval(
        user, team_volume=Decimal("2000"), matching_volume=Decimal("2000"),
        ranks=ranks, configs=configs,
    )
    assert {p["rank_id"] for p in result["bonuses_paid"]} == {1, 2}


def test_no_bonus_when_matching_volume_supports_no_rank():
    ranks = [_Rank(1, "Rank 1", "1000", sort_order=1)]
    configs = [_Config(30, 1, "matching", "10")]
    user = _User(1)
    result, _, _ = _eval(
        user, team_volume=Decimal("5000"), matching_volume=Decimal("900"),
        ranks=ranks, configs=configs,
    )
    assert result["bonuses_paid"] == [], (
        "matching volume below the first rank target must pay nothing"
    )


def test_catchup_bonus_uses_matching_volume_and_respects_cap():
    """Current rank (rank 3) achieved via 40-gen, but only rank 2 is within the
    10-gen cap: the catch-up bonus for rank 3 must NOT be paid."""
    ranks = [
        _Rank(1, "Rank 1", "1000", sort_order=1),
        _Rank(2, "Rank 2", "2000", sort_order=2),
        _Rank(3, "Rank 3", "4000", sort_order=3),
    ]
    configs = [_Config(40, 3, "matching", "10")]
    user = _User(1, rank_id=3)
    result, _, _ = _eval(
        user, team_volume=Decimal("4000"), matching_volume=Decimal("2000"),
        ranks=ranks, configs=configs,
    )
    assert result["bonuses_paid"] == [], (
        "catch-up bonus for a rank beyond the 10-gen cap must not be paid"
    )


def test_catchup_bonus_paid_when_current_rank_within_cap():
    ranks = [
        _Rank(1, "Rank 1", "1000", sort_order=1),
        _Rank(2, "Rank 2", "2000", sort_order=2),
    ]
    configs = [_Config(50, 2, "matching", "10")]
    user = _User(1, rank_id=2)
    result, _, _ = _eval(
        user, team_volume=Decimal("3000"), matching_volume=Decimal("3000"),
        ranks=ranks, configs=configs,
    )
    assert [p["rank_id"] for p in result["bonuses_paid"]] == [2], (
        "catch-up bonus must pay when the current rank is within the 10-gen cap"
    )
    assert result["bonuses_paid"][0]["eligible_amount"] == "1000", (
        "catch-up eligible must be matching_volume - target (3000 - 2000)"
    )


def test_skip_bonus_path_does_not_compute_matching_volume():
    """The KYC-approval snapshot path (skip_bonus=True) must not query the
    matching volume at all and must still assign the 40-gen rank."""
    import app.services.rank_service as rs
    ranks = [_Rank(1, "Rank 1", "1000", sort_order=1)]
    configs = [_Config(60, 1, "matching", "10")]
    user = _User(1)
    db = _EvalDB(user, ranks, configs)
    gtv = AsyncMock(return_value=(Decimal("500"), Decimal("1000")))
    gmbv = AsyncMock(return_value=(Decimal("0"), Decimal("0")))

    async def run():
        with patch("app.services.rank_service.is_kyc_approved",
                   AsyncMock(return_value=True)), patch(
            "app.services.rank_service.get_team_volume", gtv
        ), patch(
            "app.services.rank_service.get_matching_bonus_volume", gmbv
        ), patch(
            "app.services.rank_service._get_highest_qualified_rank",
            AsyncMock(return_value=ranks[0]),
        ):
            return await rs.evaluate_and_process_rank(
                user_id=user.id, db=db, skip_bonus=True,
                use_snapshot_volume=True, snapshot_volume=Decimal("1000"),
            )

    result = asyncio.run(run())
    assert gmbv.await_count == 0, "snapshot path must not compute matching volume"
    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 1
    assert result["bonuses_paid"] == []


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} MATCHING-BONUS-10GEN REGRESSION TESTS PASSED")
