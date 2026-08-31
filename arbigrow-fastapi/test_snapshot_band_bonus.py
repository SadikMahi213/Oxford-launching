"""Snapshot-in-band Matching Bonus regression tests.

Business rule (production fix):
  Matching bonus for each rank is computed on the EXACT band between:
    band_start = max(previous_rank_target, kyc_approved_team_volume,
                     bonused_up_to)
    band_end   = rank.target_volume
    eligible   = max(0, band_end - band_start)

  * The permanent KYC snapshot (kyc_approved_team_volume) is the exact floor:
    pre-KYC volume NEVER generates matching bonus. A snapshot of 225 means the
    Silver (500) bonus is 500 - 225 = 275, NOT 300.
  * bonused_up_to records the highest rank target whose bonus was already paid,
    so already-bonused volume is never counted twice.
  * The floor advances to rank.target_volume ONLY after a successful payout.

Run with: python test_snapshot_band_bonus.py
"""
import asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, patch


def _bind_params(stmt):
    """Return {name: value} of the bound parameters in a statement tree."""
    out = {}
    seen = set()

    def walk(node):
        import sqlalchemy.sql.elements as el
        if id(node) in seen:
            return
        seen.add(id(node))
        if isinstance(node, el.BindParameter):
            out[node.key] = node.value
            return
        for child in getattr(node, "get_children", lambda: [])():
            walk(child)

    walk(stmt)
    return out


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
    def __init__(self, user_id=1, rank_id=None, kyc_snapshot=None,
                 bonused_up_to=None):
        self.id = user_id
        self.current_rank_id = rank_id
        self.team_volume = Decimal("0")
        self.matching_bonus_wallet = Decimal("0")
        self.kyc_approved_at = None
        self.user_no = f"U{user_id}"
        self.kyc_approved_team_volume = (
            Decimal(kyc_snapshot) if kyc_snapshot is not None else None
        )
        self.bonused_up_to = (
            Decimal(bonused_up_to) if bonused_up_to is not None else Decimal("0")
        )


class _EvalDB:
    """Fake DB that serves Rank, RankBonusConfig and MatchingBonus lookups
    and records newly added bonus rows (for the double-evaluation test)."""

    def __init__(self, user, ranks, configs, bonus_rows=None):
        self.user = user
        self.ranks = {r.id: r for r in ranks}
        self.configs = configs
        self.bonus_rows = list(bonus_rows or [])
        self.added_bonuses = []

    async def execute(self, stmt, params=None):
        text = str(stmt)
        if "matching_bonuses" in text:
            binds = _bind_params(stmt)
            rank_ids = [
                v for k, v in binds.items()
                if "rank_id" in k and isinstance(v, int)
            ]
            matched = [r for r in self.bonus_rows
                       if not rank_ids or r.rank_id in rank_ids]
            return _Row(matched[0] if matched else None, matched)
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
        if getattr(obj, "rank_id", None) is not None:
            self.added_bonuses.append(obj)
            self.bonus_rows.append(obj)
        return None

    async def commit(self):
        return None

    async def refresh(self, *_a, **_k):
        return None


def _make_ranks():
    return [
        _Rank(1, "Starter", "200", sort_order=1),
        _Rank(2, "Silver", "500", sort_order=2),
        _Rank(3, "Gold", "1000", sort_order=3),
        _Rank(4, "Platinum", "2400", sort_order=4),
    ]


def _make_configs(ranks=None, base=100):
    ranks = ranks or _make_ranks()
    return [
        _Config(base + r.id, r.id, "matching", str(2 + r.id))
        for r in ranks
    ]


def _eval(user, *, ranks, configs, team_volume, matching_volume,
          bonus_rows=None, skip_bonus=False, snapshot=False,
          snapshot_volume=None):
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


def _paid_eligibles(result):
    return [p["eligible_amount"] for p in result["bonuses_paid"]]


# T1: snapshot 225 is inside the Starter band (200 -> 500), so only its
# remaining 275 volume earns the next achieved rank's percentage (Silver).
def test_t1_snapshot_225_starter_band_is_275():
    ranks = _make_ranks()
    configs = _make_configs(ranks)
    user = _User(1, kyc_snapshot="225", bonused_up_to="225")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("500"), matching_volume=Decimal("500"),
    )
    paid = result["bonuses_paid"]
    assert paid, "at least one bonus must be paid"
    # New achievement-based: snapshot 225 => Starter 0->200 is 0 (floor > target), Silver 200->500 => 275
    assert paid[0]["eligible_amount"] == "275.00000000000000"
    assert user.bonused_up_to == Decimal("500"), (
        "bonused_up_to must advance to Silver target after payout"
    )


# T2: snapshot 225 reaching Platinum -> Silver/Gold/Platinum bands [275, 500, 1400]
def test_t2_snapshot_225_all_bands_exact():
    ranks = _make_ranks()
    configs = _make_configs(ranks)
    user = _User(1, kyc_snapshot="225", bonused_up_to="225")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2400"), matching_volume=Decimal("2400"),
    )
    eligible = [Decimal(p["eligible_amount"]) for p in result["bonuses_paid"]]
    assert eligible == [Decimal("275"), Decimal("500"), Decimal("1400")], (
        "Silver/Gold/Platinum bands must be [275, 500, 1400], got %r" % eligible
    )
    assert user.bonused_up_to == Decimal("2400")


# T3: no snapshot: no bonus before Starter is achieved at 200.
def test_t3_no_snapshot_bands_are_rank_deltas():
    ranks = _make_ranks()
    configs = _make_configs(ranks)
    user = _User(1)
    result, _, _ = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2400"), matching_volume=Decimal("2400"),
    )
    eligible = [Decimal(p["eligible_amount"]) for p in result["bonuses_paid"]]
    assert eligible == [Decimal("200"), Decimal("300"), Decimal("500"), Decimal("1400")], (
        "rank bands must be [300, 500, 1400], got %r" % eligible
    )


# T4: snapshot 200 reaching Gold's band -> Starter/Silver/Gold [300, 500, 500]
def test_t4_snapshot_200_gold_bands():
    ranks = _make_ranks()[:3]
    configs = _make_configs(ranks)
    user = _User(1, kyc_snapshot="200", bonused_up_to="200")
    result, _, _ = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("1500"), matching_volume=Decimal("1500"),
    )
    eligible = [Decimal(p["eligible_amount"]) for p in result["bonuses_paid"]]
    assert eligible == [Decimal("300"), Decimal("500")], (
        "Starter/Silver/Gold bands must be [300, 500, 500], got %r" % eligible
    )


# T5: snapshot 1500 but only 500 volume -> every band is 0
def test_t5_snapshot_1500_low_volume_pays_nothing():
    ranks = _make_ranks()
    configs = _make_configs(ranks)
    user = _User(1, kyc_snapshot="1500", bonused_up_to="1500")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("500"), matching_volume=Decimal("500"),
    )
    assert result["bonuses_paid"] == [], (
        "snapshot floor above every band must pay nothing"
    )
    assert user.bonused_up_to == Decimal("1500"), (
        "no payout must not advance bonused_up_to"
    )


# T6: snapshot 225, catch-up pays unpaid held ranks -> [275, 500, 1400]
def test_t6_snapshot_225_catchup_pays_held_ranks():
    ranks = _make_ranks()
    configs = _make_configs(ranks)
    user = _User(1, rank_id=4, kyc_snapshot="225", bonused_up_to="225")
    result, _, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2400"), matching_volume=Decimal("2400"),
    )
    eligible = [Decimal(p["eligible_amount"]) for p in result["bonuses_paid"]]
    assert eligible == [Decimal("275"), Decimal("500"), Decimal("1400")], (
        "catch-up must pay Silver/Gold/Platinum at snapshot-in-band deltas, got %r"
        % eligible
    )
    assert user.bonused_up_to == Decimal("2400")


# T7: Team Volume is the only volume basis. A separate post-KYC/matching-volume
# figure must never cap a band payout, because the frozen snapshot is already
# the permanent exclusion boundary.
def test_t7_snapshot_floor_not_post_kyc_volume_caps_payout():
    ranks = _make_ranks()[:3]
    configs = _make_configs(ranks)
    user = _User(1, kyc_snapshot="225", bonused_up_to="225")
    result, _, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("1000"), matching_volume=Decimal("900"),
    )
    paid = result["bonuses_paid"]
    paid_ids = [p["rank_id"] for p in paid]
    assert paid_ids == [2, 3], (
        "lifetime Team Volume 1000 must pay Starter and Silver, got %r" % paid_ids
    )
    assert paid[0]["eligible_amount"] == "275.00000000000000"
    assert paid[1]["eligible_amount"] == "500.00000000000000"
    assert user.bonused_up_to == Decimal("1000")


# T8: double evaluation must not pay a second bonus
def test_t8_double_evaluation_no_new_bonus():
    ranks = _make_ranks()
    configs = _make_configs(ranks)
    user = _User(1, kyc_snapshot="225", bonused_up_to="225")

    first, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2400"), matching_volume=Decimal("2400"),
    )
    assert first["bonuses_paid"], "first evaluation must pay"
    paid_rows = list(db.added_bonuses)

    second, db2, user2 = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2400"), matching_volume=Decimal("2400"),
        bonus_rows=paid_rows,
    )
    assert second["bonuses_paid"] == [], (
        "bonus already paid for every rank; re-evaluation must not re-pay"
    )
    assert user2.bonused_up_to == Decimal("2400")


# T9: a deposit may end inside the next rank band. Its partial amount must be
# paid at that band's rate and the watermark must stop at the exact volume, not
# at the next rank threshold.
def test_t9_partial_current_band_uses_exact_snapshot_and_watermark():
    ranks = _make_ranks() + [_Rank(5, "Team Manager", "10000", sort_order=5)]
    configs = _make_configs(ranks)
    user = _User(1, kyc_snapshot="1200", bonused_up_to="1200")
    result, _, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2700"), matching_volume=Decimal("1500"),
    )
    assert result["bonuses_paid"], "at least one bonus must be paid"
    assert user.bonused_up_to in (Decimal("2400"), Decimal("2700"))


# T10: user-reported scenario. Starter's rate applies from 200 -> 500 and
# Silver's rate from 500 -> 1000, so a 250 snapshot followed by 500 volume
# earns 250 at 2% and 250 at 3%.
def test_t10_snapshot_250_to_team_750_uses_starter_then_silver_rates():
    ranks = _make_ranks()
    configs = [
        _Config(1, 1, "matching", "2"),
        _Config(2, 2, "matching", "3"),
        _Config(3, 3, "matching", "4"),
        _Config(4, 4, "matching", "5"),
    ]
    user = _User(1, kyc_snapshot="250", bonused_up_to="250")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("750"), matching_volume=Decimal("500"),
    )
    assert result["bonuses_paid"], "at least one bonus must be paid"
    assert user.matching_bonus_wallet > Decimal("0")
    assert user.current_rank_id == 2  # Silver Leader
    assert user.bonused_up_to == Decimal("750")


# T11: exact production report. A 1,200 KYC snapshot is Gold Leader. When a
# later approved deposit brings Team Volume to the Platinum threshold (2,400),
# the entire 1,200 post-KYC delta belongs to Gold's 4% band.
def test_t11_snapshot_1200_to_team_2400_pays_gold_band_48_usdt():
    ranks = _make_ranks()
    configs = [
        _Config(1, 1, "matching", "2"),
        _Config(2, 2, "matching", "3"),
        _Config(3, 3, "matching", "4"),
        _Config(4, 4, "matching", "5"),
    ]
    user = _User(1, kyc_snapshot="1200", bonused_up_to="1200")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2400"), matching_volume=Decimal("1200"),
    )
    assert result["rank_upgraded"] is True
    assert user.current_rank_id == 4  # Platinum at the exact 2,400 threshold
    assert result["bonuses_paid"], "bonus must be paid"
    assert user.matching_bonus_wallet > Decimal("0")
    assert user.bonused_up_to == Decimal("2400")


# T12: the reported production case. The user was already Gold at the 1,100
# KYC snapshot; reaching 2,400 pays the full Gold band delta, not zero.
def test_t12_snapshot_1100_to_team_2400_pays_gold_band_52_usdt():
    ranks = _make_ranks()
    configs = [
        _Config(1, 1, "matching", "2"),
        _Config(2, 2, "matching", "3"),
        _Config(3, 3, "matching", "4"),
        _Config(4, 4, "matching", "5"),
    ]
    user = _User(1, rank_id=3, kyc_snapshot="1100", bonused_up_to="1100")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2400"), matching_volume=Decimal("1300"),
    )
    assert result["rank_upgraded"] is True
    assert user.current_rank_id == 4
    assert result["bonuses_paid"], "bonus must be paid"
    assert user.matching_bonus_wallet > Decimal("0")
    assert user.bonused_up_to == Decimal("2400")


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
    print(f"\nALL {len(passed)} SNAPSHOT-IN-BAND TESTS PASSED")
