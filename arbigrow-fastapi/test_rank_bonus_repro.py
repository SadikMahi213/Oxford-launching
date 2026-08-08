"""Reproduction: rank assigned from Team Volume but matching bonus not paid.

Scenario (mirrors production user 319 / 300):
  User gets KYC-approved with a historical snapshot volume that assigns a
  high rank. Under the pre-acdf365 deploy (and for ancestors evaluated with
  skip_bonus=True), that rank is assigned WITHOUT paying the matching bonus.
  A later deposit should catch-up and pay the bonus for the held rank.

Expected business behavior:
  - A rank held in current_rank_id whose matching bonus was never paid must
    be paid when rank evaluation next runs (deposit approval / investment /
    KYC approval of a downline).
  - If multiple ranks are owed (e.g. 1..3 assigned from one snapshot), ALL
    unpaid ranks must be paid, not just the highest one.

Run: python test_rank_bonus_repro.py
"""
import asyncio
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
    def __init__(self, user, ranks, configs, bonus_rows=None):
        self.user = user
        self.ranks = {r.id: r for r in ranks}
        self.configs = configs
        self.bonus_rows = bonus_rows or []
        self.added_bonuses = []

    async def execute(self, stmt, params=None):
        text = str(stmt)
        if "matching_bonuses" in text:
            return _Row(self.bonus_rows[0] if self.bonus_rows else None, self.bonus_rows)
        if "rank_bonus_configs" in text:
            return _Row(None, self.configs)
        if "ranks" in text and "sort_order" in text:
            return _Row(None, [r for r in self.ranks.values() if r.is_active])
        return _Row(self.user)

    async def get(self, cls, obj_id):
        if cls.__name__ == "Rank":
            return self.ranks.get(obj_id)
        if cls.__name__ == "User":
            return self.user
        return None

    def add(self, obj):
        self.added_bonuses.append(obj)
        return None

    async def commit(self):
        return None

    async def refresh(self, *_a, **_k):
        return None


def _make_ranks():
    return [
        _Rank(1, "Rank 1", "200", sort_order=1),
        _Rank(2, "Rank 2", "500", sort_order=2),
        _Rank(3, "Rank 3", "1000", sort_order=3),
        _Rank(4, "Rank 4", "2400", sort_order=4),
    ]


def _make_configs():
    return [
        _Config(1, 1, "matching", "2"),
        _Config(2, 2, "matching", "3"),
        _Config(3, 3, "matching", "4"),
        _Config(4, 4, "matching", "5"),
    ]


def _eval(user, *, team_volume, matching_volume, ranks, configs, bonus_rows=None,
          skip_bonus=False, snapshot=False, snapshot_volume=None):
    db = _EvalDB(user, ranks, configs, bonus_rows=bonus_rows)

    async def run():
        import app.services.rank_service as rs

        async def highest(volume, _db):
            qual = [r for r in ranks if r.is_active and r.target_volume <= volume]
            if not qual:
                return None
            return max(qual, key=lambda r: r.sort_order)

        with patch("app.services.rank_service.is_kyc_approved",
                   AsyncMock(return_value=True)), patch(
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


def test_rank_held_but_no_bonus_paid_catchup():
    """User holds rank 3 (KYC-assigned, bonus never paid). A later deposit
    brings matching volume that supports rank 3. Catch-up MUST pay rank 3."""
    ranks = _make_ranks()
    configs = _make_configs()
    user = _User(1, rank_id=3)
    result, db, user = _eval(
        user, team_volume=Decimal("1500"), matching_volume=Decimal("1500"),
        ranks=ranks, configs=configs,
    )
    paid = result["bonuses_paid"]
    rank_ids = [p["rank_id"] for p in paid]
    print(f"  catch-up paid: {rank_ids}")
    assert 3 in rank_ids, (
        "held rank 3 with unpaid bonus must be paid on next evaluation"
    )


def test_all_owed_ranks_paid_when_volume_supports_them():
    """User was assigned ranks 1..3 from a KYC snapshot with skip_bonus (no
    bonuses). A later deposit supports all three ranks. ALL owed ranks must
    be paid, not just the highest."""
    ranks = _make_ranks()
    configs = _make_configs()
    user = _User(1, rank_id=3)
    result, db, user = _eval(
        user, team_volume=Decimal("1500"), matching_volume=Decimal("1500"),
        ranks=ranks, configs=configs,
    )
    paid = result["bonuses_paid"]
    rank_ids = [p["rank_id"] for p in paid]
    print(f"  owed-rank paid: {rank_ids}")
    assert sorted(rank_ids) == [1, 2, 3], (
        "all unpaid ranks 1,2,3 must be paid, got %r" % rank_ids
    )


def test_ancestor_skip_bonus_then_deposit_pays_all_owed():
    """Ancestor re-evaluated at downline KYC with skip_bonus=True was assigned
    ranks 1..3 without bonus. A later deposit must catch up and pay 1..3."""
    ranks = _make_ranks()
    configs = _make_configs()
    user = _User(1, rank_id=3)
    result, db, user = _eval(
        user, team_volume=Decimal("1500"), matching_volume=Decimal("1500"),
        ranks=ranks, configs=configs,
    )
    paid = result["bonuses_paid"]
    rank_ids = [p["rank_id"] for p in paid]
    print(f"  ancestor catch-up paid: {rank_ids}")
    assert sorted(rank_ids) == [1, 2, 3], (
        "ancestor ranks 1,2,3 owed must all be paid, got %r" % rank_ids
    )


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
    print(f"\n{len(passed)}/{len([n for n in globals() if n.startswith('test_')])} passed")
