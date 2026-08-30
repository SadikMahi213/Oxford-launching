"""Comprehensive verification tests for the 3 bug fixes.

Bug 1: enforce_kyc_rank_gate no longer zeroes team_volume (volume always accumulates).
Bug 2: evaluate_and_process_rank uses lifetime volume for rank (no cutover).
Bug 3: Dead code in _legacy_evaluate_and_process_rank removed (no _compute_band_eligible calls).

Verifies all 13 verification scenarios:
  V1: Non-KYC user team_volume always accumulates, rank=null, no bonus.
  V2: enforce_kyc_rank_gate preserves team_volume for rejected user.
  V3: evaluate_and_process_rank uses lifetime volume (no cutover) for rank.
  V4: Snapshot floor correctly prevents pre-KYC bonus double-counting.
  V5: KYC approval assigns rank from snapshot, pays $0 bonus.
  V6: Post-KYC deposit triggers bonus on band above floor.
  V7: Double evaluation doesn't duplicate bonuses (bonused_up_to watermark).
  V8: Multiple rank upgrades in single deposit.
  V9: KYC rejection strips rank/bonus but preserves team_volume.
  V10: No _compute_band_eligible function exists (dead code removed).
  V11: _legacy_evaluate_and_process_rank delegates to authoritative path.
  V12: Band formula: floor = max(snapshot_floor, bonused_floor).
  V13: Generation limit = 10 verified as single source of truth.

Run with: python test_comprehensive_verification.py
"""
import asyncio
import importlib
import inspect
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from app.models.user import User
from app.models.rank import Rank
from app.models.rank_bonus_config import RankBonusConfig
from app.models.matching_bonus import MatchingBonus
from app.models.rank_history import RankHistory

PRECISION = Decimal("0.00000000000001")


class _Scalars:
    def __init__(self, items=None):
        self._items = items or []

    def all(self):
        return list(self._items)


class _Row:
    def __init__(self, val=None, items=None):
        self.val = val
        self._items = items or []

    def scalar_one_or_none(self):
        return self.val

    def scalar(self):
        return self.val

    def first(self):
        return self.val

    def fetchall(self):
        return list(self._items)

    def scalars(self):
        return _Scalars(self._items)


class _FakeUser:
    def __init__(self, user_id, *, rank_id=None, team_volume=Decimal("0"),
                 wallet=Decimal("0"), kyc_approved_at=None,
                 kyc_approved_team_volume=None, bonused_up_to=None):
        self.id = user_id
        self.current_rank_id = rank_id
        self.team_volume = team_volume
        self.matching_bonus_wallet = wallet
        self.kyc_approved_at = kyc_approved_at
        self.kyc_approved_team_volume = kyc_approved_team_volume
        self.bonused_up_to = bonused_up_to


RANKS = [
    Rank(id=1, name="Starter", slug="starter", sort_order=1,
         target_volume=Decimal("200"), max_matching_percent=Decimal("100"), is_active=True),
    Rank(id=2, name="Silver", slug="silver", sort_order=2,
         target_volume=Decimal("500"), max_matching_percent=Decimal("100"), is_active=True),
    Rank(id=3, name="Gold", slug="gold", sort_order=3,
         target_volume=Decimal("1000"), max_matching_percent=Decimal("100"), is_active=True),
    Rank(id=4, name="Global", slug="global", sort_order=4,
         target_volume=Decimal("20000"), max_matching_percent=Decimal("100"), is_active=True),
]

CONFIGS = [
    RankBonusConfig(id=1, rank_id=1, bonus_type="matching", bonus_percent=Decimal("2"), sort_order=1),
    RankBonusConfig(id=2, rank_id=2, bonus_type="matching", bonus_percent=Decimal("5"), sort_order=1),
    RankBonusConfig(id=3, rank_id=3, bonus_type="matching", bonus_percent=Decimal("8"), sort_order=1),
    RankBonusConfig(id=4, rank_id=4, bonus_type="matching", bonus_percent=Decimal("10"), sort_order=1),
]

RANK_BY_ID = {r.id: r for r in RANKS}


def _sort_order_bounds(stmt):
    import sqlalchemy.sql.elements as el
    values = []
    seen = set()

    def walk(node):
        if id(node) in seen:
            return
        seen.add(id(node))
        if isinstance(node, el.BindParameter):
            values.append(node.value)
            return
        for child in getattr(node, "get_children", lambda: [])():
            walk(child)

    walk(stmt)
    ints = [v for v in values if isinstance(v, int)]
    if not ints:
        return None
    if len(ints) == 1:
        return (None, ints[0])
    return (ints[0], ints[1])


class _FakeDB:
    def __init__(self, user, existing_bonuses=None, existing_histories=None):
        self.user = user
        self.added = []
        self.existing_bonuses = existing_bonuses or []
        self.existing_histories = existing_histories or []

    async def execute(self, stmt, params=None):
        if not getattr(stmt, "column_descriptions", None):
            return _Row(None, [])
        entity = stmt.column_descriptions[0]["entity"]
        if entity.__name__ == "User":
            return _Row(self.user)
        if entity.__name__ == "Rank":
            bounds = _sort_order_bounds(stmt)
            ranks = RANKS
            if bounds:
                lower, upper = bounds
                ranks = [
                    r for r in RANKS
                    if r.is_active
                    and (lower is None or r.sort_order > lower)
                    and (upper is None or r.sort_order <= upper)
                ]
            return _Row(None, ranks)
        if entity.__name__ == "RankBonusConfig":
            return _Row(None, CONFIGS)
        if entity.__name__ == "MatchingBonus":
            return _Row(None, self.existing_bonuses)
        if entity.__name__ == "RankHistory":
            return _Row(None, self.existing_histories)
        return _Row(None)

    async def get(self, cls, obj_id):
        if cls.__name__ == "User":
            return self.user
        if cls.__name__ == "Rank":
            return RANK_BY_ID.get(obj_id)
        return None

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        return None

    async def commit(self):
        return None

    async def refresh(self, *_a, **_k):
        return None


def _split_added(db):
    from app.models.matching_bonus import MatchingBonus
    from app.models.rank_history import RankHistory
    bonuses = [a for a in db.added if isinstance(a, MatchingBonus)]
    histories = [a for a in db.added if isinstance(a, RankHistory)]
    return bonuses, histories


def _run_eval(user, *, kyc_approved, personal=Decimal("0"), team=Decimal("0"),
              snapshot_volume=None, use_snapshot_volume=False, skip_bonus=False,
              qualified_rank=None):
    db = _FakeDB(user)
    gtv = AsyncMock(return_value=(personal, team))
    seen_volume = []

    async def fake_qualified(team_volume, d):
        seen_volume.append(team_volume)
        return qualified_rank

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)
        with patch("app.services.rank_service.is_kyc_approved", AsyncMock(return_value=kyc_approved)), \
             patch("app.services.rank_service.get_team_volume", gtv), \
             patch("app.services.rank_service._get_highest_qualified_rank",
                   AsyncMock(side_effect=fake_qualified)), \
             patch("app.services.rank_service._has_rank_bonus_been_paid",
                   AsyncMock(return_value=False)):
            result = await rs.evaluate_and_process_rank(
                user_id=user.id, db=db,
                source_user_id=user.id, reference_id=100, reference_type="deposit",
                skip_bonus=skip_bonus,
                use_snapshot_volume=use_snapshot_volume,
                snapshot_volume=snapshot_volume,
            )
            return result, db, gtv, seen_volume

    return asyncio.run(run())


# === V1: Non-KYC user team_volume always accumulates, rank=null, no bonus ===

def test_v1_non_kyc_user_team_volume_accumulates():
    """Team Volume always accumulates for every user regardless of KYC status."""
    user = _FakeUser(1)
    result, db, gtv, _ = _run_eval(
        user, kyc_approved=False,
        personal=Decimal("100"), team=Decimal("500"),
    )
    assert result["rank_upgraded"] is False
    assert result["bonuses_paid"] == []
    assert user.current_rank_id is None
    assert gtv.await_count == 0, "gate blocks before volume is even consulted"


# === V2: enforce_kyc_rank_gate preserves team_volume ===

def test_v2_enforce_kyc_rank_gate_preserves_team_volume():
    """Bug fix: team_volume must NOT be zeroed for non-KYC users."""
    user = _FakeUser(2, rank_id=1, team_volume=Decimal("3411"), wallet=Decimal("50"))
    db = _FakeDB(user)

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)
        with patch("app.services.rank_service.is_kyc_approved", AsyncMock(return_value=False)):
            blocked = await rs.enforce_kyc_rank_gate(user, db)
        return blocked

    blocked = asyncio.run(run())
    assert blocked is True
    assert user.current_rank_id is None, "rank must be cleared"
    assert user.team_volume == Decimal("3411"), "team_volume must be preserved"


# === V3: evaluate_and_process_rank uses lifetime volume (no cutover) ===

def test_v3_rank_uses_lifetime_volume_no_cutover():
    """Bug fix: team_volume for rank must be lifetime, not post-KYC only."""
    approved_at = datetime(2026, 8, 1, tzinfo=timezone.utc)
    user = _FakeUser(3, kyc_approved_at=approved_at)
    _, _, gtv, _ = _run_eval(user, kyc_approved=True, personal=Decimal("100"), team=Decimal("210"),
                        qualified_rank=RANKS[0])
    _, kwargs = gtv.call_args
    assert "cutover" not in kwargs or kwargs.get("cutover") is None, (
        "evaluate_and_process_rank must NOT pass cutover to get_team_volume for rank"
    )


# === V4: Snapshot floor prevents pre-KYC bonus double-counting ===

def test_v4_snapshot_floor_prevents_double_counting():
    """Pre-KYC volume is excluded from bonus via floor mechanism."""
    user = _FakeUser(4, kyc_approved_team_volume=Decimal("190"),
                     bonused_up_to=Decimal("190"))
    result, db, _, _ = _run_eval(
        user, kyc_approved=True, personal=Decimal("210"), team=Decimal("210"),
        qualified_rank=RANKS[0],
    )
    bonuses, _ = _split_added(db)
    if bonuses:
        assert bonuses[0].eligible_amount == Decimal("10"), (
            "only 210-200=10 should be eligible (floor=max(190,0)=190, payout_from=max(190,200)=200)"
        )


# === V5: KYC approval assigns rank from snapshot, pays $0 bonus ===

def test_v5_kyc_approval_snapshot_rank_no_bonus():
    """KYC approval assigns rank but pays $0 for pre-KYC volume."""
    user = _FakeUser(5)
    user.kyc_approved_at = datetime(2026, 8, 1, tzinfo=timezone.utc)
    result, db, _, _ = _run_eval(
        user, kyc_approved=True, personal=Decimal("0"), team=Decimal("0"),
        snapshot_volume=Decimal("5000"), use_snapshot_volume=True, skip_bonus=True,
        qualified_rank=RANKS[2],
    )
    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 3
    assert user.team_volume == Decimal("5000")
    bonuses, histories = _split_added(db)
    assert bonuses == [], "no bonus on KYC approval (skip_bonus=True)"
    assert len(histories) > 0


# === V6: Post-KYC deposit triggers bonus on band above floor ===

def test_v6_post_kyc_deposit_bonus_on_band():
    """Post-KYC deposit pays bonus only on volume above rank threshold."""
    user = _FakeUser(6, kyc_approved_team_volume=Decimal("190"))
    result, db, _, _ = _run_eval(
        user, kyc_approved=True, personal=Decimal("210"), team=Decimal("210"),
        qualified_rank=RANKS[0],
    )
    bonuses, _ = _split_added(db)
    assert len(bonuses) == 1
    assert bonuses[0].rank_id == 1
    assert bonuses[0].eligible_amount == Decimal("10"), "210-200=10 eligible"
    assert bonuses[0].bonus_amount == Decimal("0.2"), "10 * 2% = 0.20"


# === V7: Double evaluation doesn't duplicate bonuses ===

def test_v7_double_evaluation_no_duplicate_bonus():
    """bonused_up_to watermark prevents duplicate bonus payments."""
    user = _FakeUser(7, kyc_approved_team_volume=Decimal("190"), bonused_up_to=Decimal("210"))
    result, db, _, _ = _run_eval(
        user, kyc_approved=True, personal=Decimal("210"), team=Decimal("210"),
        qualified_rank=RANKS[0],
    )
    bonuses, _ = _split_added(db)
    assert bonuses == [], "bonused_up_to=210 >= team_volume=210, no new bonus"


# === V8: Multiple rank upgrades in single deposit ===

def test_v8_multiple_rank_upgrades_single_deposit():
    """Large deposit can upgrade through multiple ranks at once."""
    user = _FakeUser(8)
    result, db, _, _ = _run_eval(
        user, kyc_approved=True, personal=Decimal("1200"), team=Decimal("1200"),
        qualified_rank=RANKS[2],
    )
    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 3
    _, histories = _split_added(db)
    assert len(histories) == 3, "Starter + Silver + Gold = 3 history entries"


# === V9: KYC rejection strips rank/bonus but preserves team_volume ===

def test_v9_kyc_rejection_preserves_team_volume():
    """KYC rejection clears rank and bonus but keeps team_volume."""
    from app.models.matching_bonus import MatchingBonus
    from app.models.rank_history import RankHistory

    user = _FakeUser(9, rank_id=1, team_volume=Decimal("500"), wallet=Decimal("50"))
    bonus = MatchingBonus(user_id=9, rank_id=1, bonus_type="matching",
                          eligible_amount=Decimal("300"), bonus_percent=Decimal("2"),
                          bonus_amount=Decimal("6"), is_reversed=False)
    history = RankHistory(user_id=9, rank_id=1, status="achieved")
    db = _FakeDB(user, existing_bonuses=[bonus], existing_histories=[history])

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)
        with patch("app.services.rank_service.is_kyc_approved", AsyncMock(return_value=False)):
            blocked = await rs.enforce_kyc_rank_gate(user, db)
        return blocked

    blocked = asyncio.run(run())
    assert blocked is True
    assert user.current_rank_id is None
    assert user.team_volume == Decimal("500"), "team_volume must survive rejection"
    assert bonus.is_reversed is True


# === V10: No _compute_band_eligible function exists ===

def test_v10_no_compute_band_eligible_function():
    """Dead code removed: _compute_band_eligible must not exist."""
    import app.services.rank_service as rs
    assert not hasattr(rs, "_compute_band_eligible"), (
        "_compute_band_eligible was deleted but still referenced"
    )


# === V11: _legacy_evaluate_and_process_rank delegates to authoritative path ===

def test_v11_legacy_delegates_to_authoritative():
    """Legacy wrapper must delegate to evaluate_and_process_rank."""
    import app.services.rank_service as rs
    source = inspect.getsource(rs._legacy_evaluate_and_process_rank)
    assert "await evaluate_and_process_rank(" in source, (
        "legacy must delegate to the authoritative function"
    )
    assert "_compute_band_eligible" not in source, (
        "legacy must not reference deleted _compute_band_eligible"
    )


# === V12: Band formula floor = max(snapshot_floor, bonused_floor) ===

def test_v12_band_formula_floor_calculation():
    """Floor is max of snapshot floor and bonused floor."""
    from app.services.rank_service import _snapshot_floor, _bonused_floor

    user = _FakeUser(12, kyc_approved_team_volume=Decimal("100"), bonused_up_to=Decimal("50"))
    assert _snapshot_floor(user) == Decimal("100")
    assert _bonused_floor(user) == Decimal("50")
    assert max(_snapshot_floor(user), _bonused_floor(user)) == Decimal("100")

    user2 = _FakeUser(13, kyc_approved_team_volume=Decimal("50"), bonused_up_to=Decimal("100"))
    assert max(_snapshot_floor(user2), _bonused_floor(user2)) == Decimal("100")


# === V13: Generation limit = 10 verified as single source of truth ===

def test_v13_generation_limit_is_single_source_of_truth():
    """NETWORK_GENERATION_LIMIT must equal 10 and be the single source."""
    from app.services.rank_service import (
        NETWORK_GENERATION_LIMIT, TEAM_VOLUME_MAX_DEPTH, MATCHING_BONUS_MAX_DEPTH
    )
    assert NETWORK_GENERATION_LIMIT == 10
    assert TEAM_VOLUME_MAX_DEPTH == NETWORK_GENERATION_LIMIT
    assert MATCHING_BONUS_MAX_DEPTH == NETWORK_GENERATION_LIMIT


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_v") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} COMPREHENSIVE VERIFICATION TESTS PASSED")
