"""End-to-end regression tests for the KYC-first rank gate.

Business policy exercised against the real orchestration in
``app.services.rank_service.evaluate_and_process_rank``:

  1. Team Volume ALWAYS accumulates for every user (pending / rejected /
     not-submitted KYC included) - deposits are always recorded.
  2. Until KYC is APPROVED a user may NEVER hold a rank, receive a matching
     bonus, or be upgraded - regardless of how large the team volume is.
  3. On KYC approval the FULL historical team volume assigns the rank ONCE
     (snapshot path, skip_bonus=True), but that pre-KYC volume pays $0 bonus:
     "Matching Bonus generated from previous 100,000 = 0." No historical
     bonus is created simply because KYC was approved. Re-running approval
     never re-assigns or duplicates anything.
  4. After KYC approval, only post-approval deposits drive matching bonuses
     and future rank upgrades (cutover = kyc_approved_at).
  5. Pre-approval volume NEVER generates a bonus.

Run with: python test_kyc_rank_gate_e2e.py
"""
import asyncio
import importlib
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from app.models.user import User
from app.models.rank import Rank
from app.models.rank_bonus_config import RankBonusConfig
from app.models.matching_bonus import MatchingBonus
from app.models.rank_history import RankHistory

# Realistic rank ladder (sort_order == target volume tiers used elsewhere).
RANKS = [
    Rank(id=1, name="Starter", slug="starter", sort_order=1, target_volume=Decimal("200"), max_matching_percent=Decimal("100"), is_active=True),
    Rank(id=2, name="Silver", slug="silver", sort_order=2, target_volume=Decimal("500"), max_matching_percent=Decimal("100"), is_active=True),
    Rank(id=3, name="Gold", slug="gold", sort_order=3, target_volume=Decimal("1000"), max_matching_percent=Decimal("100"), is_active=True),
    Rank(id=4, name="Global", slug="global", sort_order=4, target_volume=Decimal("20000"), max_matching_percent=Decimal("100"), is_active=True),
]

# One bonus config per rank so each qualifying rank emits one MatchingBonus row.
CONFIGS = [
    RankBonusConfig(id=1, rank_id=1, bonus_type="matching", bonus_percent=Decimal("10"), sort_order=1),
    RankBonusConfig(id=2, rank_id=2, bonus_type="matching", bonus_percent=Decimal("10"), sort_order=1),
    RankBonusConfig(id=3, rank_id=3, bonus_type="matching", bonus_percent=Decimal("10"), sort_order=1),
    RankBonusConfig(id=4, rank_id=4, bonus_type="matching", bonus_percent=Decimal("10"), sort_order=1),
]

RANK_BY_ID = {r.id: r for r in RANKS}


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
    def __init__(self, user_id):
        self.id = user_id
        self.current_rank_id = None
        self.team_volume = Decimal("0")
        self.matching_bonus_wallet = Decimal("0")
        self.kyc_approved_at = None


class _FakeDB:
    """Routes the real SQLAlchemy statements issued by evaluate_and_process_rank."""

    def __init__(self, user):
        self.user = user
        self.added = []  # MatchingBonus / RankHistory objects added
        self.calls = []  # every executed statement (str)

    async def execute(self, stmt, params=None):
        self.calls.append(str(stmt))
        if not getattr(stmt, "column_descriptions", None):
            # recursive CTE -> no descendants
            return _Row(None, [])
        entity = stmt.column_descriptions[0]["entity"]
        if entity == User:
            return _Row(self.user)
        if entity == Rank:
            return _Row(None, RANKS)
        if entity == RankBonusConfig:
            return _Row(None, CONFIGS)
        if entity == MatchingBonus:
            return _Row(None, [])
        if entity == RankHistory:
            return _Row(None, [])
        return _Row(None)

    async def get(self, cls, obj_id):
        if cls == User:
            return self.user
        if cls == Rank:
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


def _rank_of(history_row):
    return RANK_BY_ID.get(history_row.rank_id)


def _run_eval(user, *, kyc_approved, personal=Decimal("0"), team=Decimal("0"),
             snapshot_volume=None, use_snapshot_volume=False, skip_bonus=False,
             qualified_rank=None):
    """Run the real evaluate_and_process_rank with mocks only for the I/O seams.

    ``qualified_rank`` lets the test control which rank the volume qualifies for
    while recording the exact team_volume handed to the qualification check.
    """
    db = _FakeDB(user)
    seen_volume = []
    gtv = AsyncMock(return_value=(personal, team))

    async def fake_qualified(team_volume, d):
        seen_volume.append(team_volume)
        return qualified_rank

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)
        with patch("app.services.rank_service.is_kyc_approved", AsyncMock(return_value=kyc_approved)), patch(
            "app.services.rank_service.get_team_volume", gtv
        ), patch(
            "app.services.rank_service._get_highest_qualified_rank", AsyncMock(side_effect=fake_qualified)
        ), patch(
            "app.services.rank_service._has_rank_bonus_been_paid", AsyncMock(return_value=False)
        ):
            result = await rs.evaluate_and_process_rank(
                user_id=user.id,
                db=db,
                source_user_id=user.id,
                reference_id=100,
                reference_type="deposit",
                skip_bonus=skip_bonus,
                use_snapshot_volume=use_snapshot_volume,
                snapshot_volume=snapshot_volume,
            )
            return result, db, gtv, seen_volume

    return asyncio.run(run())


def _split_added(db):
    bonuses = [a for a in db.added if isinstance(a, MatchingBonus)]
    histories = [a for a in db.added if isinstance(a, RankHistory)]
    return bonuses, histories


# --- Scenario 1: pending + deposit -------------------------------------

def test_pending_with_qualifying_deposit_never_gets_rank_or_bonus():
    user = _FakeUser(1)
    # Huge volume that WOULD qualify for the top rank - the gate must block it.
    result, db, gtv, seen = _run_eval(
        user, kyc_approved=False, personal=Decimal("5000"), team=Decimal("50000"),
        qualified_rank=RANKS[3],
    )
    assert result["rank_upgraded"] is False
    assert result["new_rank"] is None
    assert result["bonuses_paid"] == []
    assert user.current_rank_id is None
    assert gtv.await_count == 0, "volume must not even be consulted for non-approved users"
    assert seen == [], "rank qualification must never run for non-approved users"


# --- Scenario 2: pending + large volume ---------------------------------

def test_pending_with_large_team_volume_no_rank_no_bonus():
    user = _FakeUser(2)
    result, db, gtv, seen = _run_eval(
        user, kyc_approved=False, personal=Decimal("120000"), team=Decimal("500000"),
        qualified_rank=RANKS[3],
    )
    assert result["rank_upgraded"] is False
    assert result["bonuses_paid"] == []
    bonuses, histories = _split_added(db)
    assert bonuses == [] and histories == []
    assert gtv.await_count == 0


# --- Scenario 3: KYC approval assigns rank from snapshot, pays $0 bonus ----

def test_kyc_approval_assigns_rank_from_snapshot_without_pre_kyc_bonus():
    user = _FakeUser(3)
    user.kyc_approved_at = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
    # The deposit happened BEFORE approval, so post-cutover personal volume is 0.
    # The snapshot path must assign the rank from the full historical team volume
    # BUT pay NO matching bonus for that pre-KYC volume (policy: "Matching Bonus
    # generated from previous 100,000 = 0").
    result, db, gtv, seen = _run_eval(
        user, kyc_approved=True, personal=Decimal("0"), team=Decimal("0"),
        snapshot_volume=Decimal("50000"), use_snapshot_volume=True, skip_bonus=True,
        qualified_rank=RANKS[3],
    )
    assert seen == [Decimal("50000")], (
        "rank qualification uses the full historical snapshot (no matching volume)"
    )
    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 4
    assert user.current_rank_id == 4
    assert user.team_volume == Decimal("50000")
    bonuses, histories = _split_added(db)
    assert bonuses == [], "pre-KYC snapshot volume must NOT generate a matching bonus"
    assert user.matching_bonus_wallet == Decimal("0")
    assert result["bonuses_paid"] == []
    assert len(histories) == 4, "each newly achieved rank gets a rank history entry"
    assert all(h.status == "achieved" for h in histories)


# --- Scenario 3a: KYC approval with NO team volume --------------------------

def test_kyc_approval_with_zero_team_volume_no_rank_no_bonus():
    user = _FakeUser(31)
    user.kyc_approved_at = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
    result, db, gtv, seen = _run_eval(
        user, kyc_approved=True, personal=Decimal("0"), team=Decimal("0"),
        snapshot_volume=Decimal("0"), use_snapshot_volume=True, skip_bonus=True,
        qualified_rank=None,
    )
    assert result["rank_upgraded"] is False
    assert result["new_rank"] is None
    assert result["bonuses_paid"] == []
    assert user.current_rank_id is None
    assert user.matching_bonus_wallet == Decimal("0")
    bonuses, histories = _split_added(db)
    assert bonuses == [] and histories == []


# --- Scenario 3c: controlled case (pre-KYC 190, threshold 200) --------------

def test_controlled_pre_kyc_190_no_rank_then_post_kyc_10_still_no_rank():
    """The exact acceptance scenario:

    Pre-KYC Team Volume = 190, rank threshold = 200, KYC approved.
    Rank calc is allowed but 190 < 200 -> no rank, no bonus, wallet stays 0.
    Then a post-KYC deposit of 10 makes lifetime = 200, but the eligible
    post-KYC volume is only 10 -> the user must NOT receive the rank merely
    because lifetime reached 200.
    """
    user = _FakeUser(32)
    user.kyc_approved_at = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)

    # (a) KYC approval with the pre-KYC snapshot = 190. No rank (below 200).
    result, db, gtv, seen = _run_eval(
        user, kyc_approved=True, personal=Decimal("0"), team=Decimal("0"),
        snapshot_volume=Decimal("190"), use_snapshot_volume=True, skip_bonus=True,
        qualified_rank=None,
    )
    assert result["rank_upgraded"] is False
    assert result["bonuses_paid"] == []
    assert user.matching_bonus_wallet == Decimal("0")
    bonuses, histories = _split_added(db)
    assert bonuses == [] and histories == []
    assert seen == [Decimal("190")], "rank qualification uses the snapshot once"

    # (b) Post-KYC eligible volume = 10 (lifetime is now 200). The cutover path
    # only sees the post-approval 10, so no rank and no retroactive bonus.
    result2, db2, _, seen2 = _run_eval(
        user, kyc_approved=True, personal=Decimal("10"), team=Decimal("10"),
        qualified_rank=None,
    )
    assert result2["rank_upgraded"] is False
    assert result2["bonuses_paid"] == []
    assert user.matching_bonus_wallet == Decimal("0")
    bonuses2, histories2 = _split_added(db2)
    assert bonuses2 == [] and histories2 == []
    assert seen2 == [Decimal("10")], "post-KYC volume (not lifetime) drives rank eligibility"


# --- Scenario 3b: re-running KYC approval must not duplicate anything -------

def test_kyc_approval_retry_does_not_duplicate_bonus():
    user = _FakeUser(30)
    user.kyc_approved_at = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
    # First approval already assigned rank 4 (no bonus); the retry must not
    # re-assign or credit anything again (rank is unchanged).
    db = _FakeDB(user)
    gtv = AsyncMock(return_value=(Decimal("0"), Decimal("0")))

    async def fake_qualified(team_volume, d):
        return RANKS[3]

    async def fake_has_paid(uid, rank_id, d):
        return True  # bonus would be considered already paid (or N/A)

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)
        with patch("app.services.rank_service.is_kyc_approved", AsyncMock(return_value=True)), patch(
            "app.services.rank_service.get_team_volume", gtv
        ), patch(
            "app.services.rank_service._get_highest_qualified_rank", AsyncMock(side_effect=fake_qualified)
        ), patch(
            "app.services.rank_service._has_rank_bonus_been_paid", AsyncMock(side_effect=fake_has_paid)
        ):
            user.current_rank_id = 4  # already ranked from the first approval
            result = await rs.evaluate_and_process_rank(
                user_id=user.id,
                db=db,
                source_user_id=user.id,
                reference_id=100,
                reference_type="kyc",
                skip_bonus=True,
                use_snapshot_volume=True,
                snapshot_volume=Decimal("50000"),
            )
            return result, db

    result, db = asyncio.run(run())
    assert result["rank_upgraded"] is False, "retry must not re-upgrade an already-ranked user"
    assert result["bonuses_paid"] == [], "retry must not pay a duplicate bonus"
    bonuses, histories = _split_added(db)
    assert bonuses == [], "no new MatchingBonus rows on retry"
    assert histories == [], "no new rank history rows on retry"


# --- Scenario 4: post-KYC volume triggers bonuses and upgrades -----------

def test_post_kyc_deposit_triggers_bonuses_and_rank_upgrade():
    user = _FakeUser(4)
    user.kyc_approved_at = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
    # Post-approval deposit drives team volume from the cutover. The volume is
    # handed to the rank qualification check TWICE now: once for the 10-gen Team
    # Volume (rank upgrade) and once for the matching volume (same 10-gen scope).
    result, db, gtv, seen = _run_eval(
        user, kyc_approved=True, personal=Decimal("500"), team=Decimal("50000"),
        qualified_rank=RANKS[3],
    )
    assert seen == [Decimal("50000"), Decimal("50000")]
    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 4
    assert user.current_rank_id == 4
    bonuses, histories = _split_added(db)
    assert len(bonuses) == 4, "each newly achieved rank pays a matching bonus"
    assert all(not b.is_reversed for b in bonuses)
    assert sum(b.bonus_amount for b in bonuses) == Decimal("2000")  # 10% of each tier delta (200+300+500+19000)
    assert user.matching_bonus_wallet == Decimal("2000")
    assert len(result["bonuses_paid"]) == 4
    assert len(histories) == 4


# --- Scenario 5: pre-approval volume never generates a bonus -------------

def test_get_team_volume_filters_pre_approval_deposits_by_cutover():
    seen = []

    class CaptureDB:
        async def execute(self, stmt, params=None):
            seen.append(str(stmt))
            # recursive CTE -> one descendant with id 2 so the team query runs too
            if not getattr(stmt, "column_descriptions", None):
                return _Row(None, [(2,)])
            return _Row(Decimal("0"))

        async def get(self, *_a, **_k):
            return None

    async def run(cutover):
        import app.services.rank_service as rs
        importlib.reload(rs)
        seen.clear()
        await rs.get_team_volume(1, CaptureDB(), cutover=cutover)
        return list(seen)

    with_cutover = asyncio.run(run(datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)))
    assert any("created_at" in s and ">=" in s for s in with_cutover), (
        "cutover must filter deposits created before KYC approval"
    )

    without_cutover = asyncio.run(run(None))
    assert all("created_at" not in s or ">=" not in s for s in without_cutover), (
        "without a cutover, lifetime volume is counted (Team Volume always accumulates)"
    )


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} KYC-RANK E2E REGRESSION TESTS PASSED")
