"""Matching Bonus: an achieved rank pays ONCE, then waits for the next target.

Regression tests for the reported issue (user aa@gmail.com, Royal Manager
11% paid on every subsequent deposit): volume growth above the highest
achieved rank's target must NOT generate repeated bonuses at that rank's
rate. The next bonus becomes eligible only when Team Volume reaches the
next rank target. Each rank band pays at most once (watermark-guarded).

Run with: python test_matching_bonus_no_repeat.py
"""
from decimal import Decimal

from test_snapshot_band_bonus import _Rank, _Config, _User, _eval


def _aa_ranks():
    # Mirrors the production shape behind the aa@gmail.com report:
    # previous rank 10,000 @6%, Royal 20,000 @11%, next rank 30,000 @12%.
    return [
        _Rank(5, "Team Manager", "10000", sort_order=5),
        _Rank(6, "Royal Manager", "20000", sort_order=6),
        _Rank(7, "Global Manager", "30000", sort_order=7),
    ]


def _aa_configs(ranks=None):
    ranks = ranks or _aa_ranks()
    return [_Config(100 + r.id, r.id, "matching", "11" if r.id == 6 else ("6" if r.id == 5 else "12")) for r in ranks]


def test_royal_first_achievement_pays_full_band_once():
    ranks, configs = _aa_ranks(), _aa_configs()
    user = _User(1, rank_id=5, kyc_snapshot="10", bonused_up_to="10000")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("20010"), matching_volume=Decimal("20010"),
    )
    paid = result["bonuses_paid"]
    assert len(paid) == 1, f"exactly one Royal payout, got {paid}"
    assert paid[0]["eligible_amount"] == "10000.00000000000000"
    assert user.matching_bonus_wallet == Decimal("1100")
    assert user.bonused_up_to == Decimal("20000")
    assert user.current_rank_id == 6


def test_topups_below_next_target_pay_nothing():
    # The reported scenario: team grows 20010 -> 20090 while Royal (20,000)
    # is the top achieved rank and Global (30,000) is not reached.
    ranks, configs = _aa_ranks(), _aa_configs()
    user = _User(1, rank_id=6, kyc_snapshot="10", bonused_up_to="20000")
    before = Decimal("1100")
    user.matching_bonus_wallet = before
    prev_rows = None
    for team in ("20020", "20040", "20060", "20090"):
        result, db, user = _eval(
            user, ranks=ranks, configs=configs,
            team_volume=Decimal(team), matching_volume=Decimal(team),
            bonus_rows=prev_rows,
        )
        assert result["bonuses_paid"] == [], f"team {team} must pay nothing"
        prev_rows = list(db.bonus_rows)
    assert user.matching_bonus_wallet == before
    assert user.bonused_up_to == Decimal("20000")


def test_next_rank_crossing_pays_each_new_band_once():
    ranks, configs = _aa_ranks(), _aa_configs()
    user = _User(1, rank_id=6, kyc_snapshot="10", bonused_up_to="20090")
    user.matching_bonus_wallet = Decimal("1109.90")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("31000"), matching_volume=Decimal("31000"),
    )
    paid = result["bonuses_paid"]
    assert len(paid) == 1, f"exactly one Global payout, got {paid}"
    # Royal band is exhausted ([20090, 20000] empty); only the not-yet-paid
    # slice of Global's band pays: [20090, 30000] @12%.
    assert paid[0]["eligible_amount"] == "9910.00000000000000"
    assert user.matching_bonus_wallet == Decimal("1109.90") + Decimal("1189.20")
    assert user.bonused_up_to == Decimal("30000")
    assert user.current_rank_id == 7


def test_repeat_evaluation_same_volume_pays_nothing():
    ranks, configs = _aa_ranks(), _aa_configs()
    user = _User(1, rank_id=6, kyc_snapshot="10", bonused_up_to="20000")
    kwargs = dict(ranks=ranks, configs=configs,
                  team_volume=Decimal("20090"), matching_volume=Decimal("20090"))
    result, db, user = _eval(user, **kwargs)
    assert result["bonuses_paid"] == []
    result2, db2, user2 = _eval(user, bonus_rows=list(db.bonus_rows), **kwargs)
    assert result2["bonuses_paid"] == []
    assert user2.matching_bonus_wallet == Decimal("0")
    assert user2.bonused_up_to == Decimal("20000")


def test_multi_rank_jump_pays_each_new_band_once():
    # Phase-8 example shape: floor 500, team jumps to 2,500 across the
    # 1,000 and 2,400 thresholds in a single deposit event.
    ranks = [
        _Rank(2, "Silver", "500", sort_order=2),
        _Rank(3, "Gold", "1000", sort_order=3),
        _Rank(4, "Platinum", "2400", sort_order=4),
    ]
    configs = [
        _Config(102, 2, "matching", "3"),
        _Config(103, 3, "matching", "4"),
        _Config(104, 4, "matching", "5"),
    ]
    user = _User(1, rank_id=2, kyc_snapshot="10", bonused_up_to="500")
    result, db, user = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2500"), matching_volume=Decimal("2500"),
    )
    paid = result["bonuses_paid"]
    assert len(paid) == 2, f"Gold + Platinum exactly once each, got {paid}"
    assert paid[0]["eligible_amount"] == "500.00000000000000"   # [500, 1000] @4%
    assert paid[1]["eligible_amount"] == "1400.00000000000000"  # [1000, 2400] @5%
    assert user.matching_bonus_wallet == Decimal("20") + Decimal("70")
    assert user.bonused_up_to == Decimal("2400")
    assert user.current_rank_id == 4
    # Volume above Platinum (2400 -> 2500) earns nothing yet.
    result2, _, user2 = _eval(
        user, ranks=ranks, configs=configs,
        team_volume=Decimal("2500"), matching_volume=Decimal("2500"),
        bonus_rows=list(db.bonus_rows),
    )
    assert result2["bonuses_paid"] == []


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
    total = len([n for n, f in globals().items() if n.startswith("test_") and callable(f)])
    print(f"\n{len(passed)}/{total} NO-REPEAT TESTS PASSED")
    raise SystemExit(0 if len(passed) == total else 1)
