"""Regression tests: a KYC-approved user's rank updates after an eligible deposit.

Reported production bug (fixed in app/services/rank_service.py):
  User is KYC-approved with Team Volume = 180 (snapshot floor). A new approved
  deposit of 20 brings the lifetime Team Volume to 200 = Starter threshold, but
  the API showed teamVolume 200 while currentRank stayed null because rank
  evaluation only saw the post-approval volume (20), never the accumulated
  total (180 + 20).

Fixed business rule:
  * For a KYC-approved user, rank-eligible Team Volume is the ACCUMULATED total:
    the permanent pre-approval snapshot floor (kyc_approved_team_volume) plus
    all post-approval volume. The cutover already excludes pre-approval
    deposits, so adding the floor never double-counts.
  * A deposit that pushes the accumulated Team Volume across a rank threshold
    upgrades the user AND persists current_rank_id + RankHistory.
  * Matching bonuses STILL use only post-approval volume and the snapshot-in-band
    rule, so pre-KYC volume never generates a bonus.
  * Downline deposits upgrade KYC-approved ancestors even when the ancestor
    made no post-approval deposit themselves (personal_volume == 0).
  * The KYC gate still runs first: pending/rejected users are never ranked.

Run with: python test_rank_update_after_deposit.py
"""
import asyncio
import importlib
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

WALLET_PRECISION = Decimal("0.00000000000001")

class _RankStub:
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


class _ConfigStub:
    def __init__(self, bid, rank_id, bonus_type, percent, sort_order=1):
        self.id = bid
        self.rank_id = rank_id
        self.bonus_type = bonus_type
        self.bonus_percent = Decimal(percent)
        self.sort_order = sort_order


# Realistic rank ladder (sort_order == target volume tiers).
RANKS = [
    _RankStub(1, "Starter", "200"),
    _RankStub(2, "Silver", "500"),
    _RankStub(3, "Gold", "1000"),
    _RankStub(4, "Global", "20000"),
]
CONFIGS = [
    _ConfigStub(1, 1, "matching", "10"),
    _ConfigStub(2, 2, "matching", "10"),
    _ConfigStub(3, 3, "matching", "10"),
    _ConfigStub(4, 4, "matching", "10"),
]
RANK_BY_ID = {r.id: r for r in RANKS}


class _BonusStub:
    def __init__(self, rank_id, eligible, amount):
        self.id = 0
        self.user_id = 1
        self.rank_id = rank_id
        self.bonus_type = "matching"
        self.eligible_amount = eligible
        self.bonus_percent = Decimal("10")
        self.bonus_amount = amount
        self.is_reversed = False
        self.reversed_at = None
        self.reversal_reason = None


class _UserStub:
    def __init__(self, user_id=1, rank_id=None):
        self.id = user_id
        self.current_rank_id = rank_id
        self.team_volume = Decimal("0")
        self.matching_bonus_wallet = Decimal("0")
        self.kyc_approved_at = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
        self.kyc_approved_team_volume = None
        self.bonused_up_to = Decimal("0")
        self.user_no = f"U{user_id}"


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


def _bind_params(stmt):
    import sqlalchemy.sql.elements as el

    out = {}
    seen = set()

    def walk(node):
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


def _sort_order_bounds(stmt):
    values = [v for v in _bind_params(stmt).values() if isinstance(v, int)]
    if not values:
        return None
    if len(values) == 1:
        return (None, values[0])
    return (values[0], values[1])


class _FakeDB:
    """Routes the real SQLAlchemy statements from evaluate_and_process_rank.

    Rank selects honor their sort_order WHERE clause; RankBonusConfig and
    MatchingBonus selects honor their rank_id IN filters, so the double-pay
    guard (_has_rank_bonus_been_paid) behaves like the real database.
    """

    def __init__(self, user, bonus_rows=None):
        self.user = user
        self.bonus_rows = list(bonus_rows or [])
        self.added = []
        self.calls = []

    async def execute(self, stmt, params=None):
        self.calls.append(str(stmt))
        if not getattr(stmt, "column_descriptions", None):
            return _Row(None, [])
        entity = stmt.column_descriptions[0]["entity"]
        from app.models.user import User
        from app.models.rank import Rank
        from app.models.rank_bonus_config import RankBonusConfig
        from app.models.matching_bonus import MatchingBonus
        from app.models.rank_history import RankHistory

        if entity == User:
            return _Row(self.user)
        if entity == Rank:
            bounds = _sort_order_bounds(stmt)
            ranks = [r for r in RANKS if r.is_active]
            if bounds:
                lower, upper = bounds
                ranks = [
                    r for r in ranks
                    if (lower is None or r.sort_order > lower)
                    and (upper is None or r.sort_order <= upper)
                ]
            return _Row(None, ranks)
        if entity == RankBonusConfig:
            binds = _bind_params(stmt)
            rank_ids = [v for k, v in binds.items() if "rank_id" in k and isinstance(v, int)]
            configs = [c for c in CONFIGS if not rank_ids or c.rank_id in rank_ids]
            return _Row(None, configs)
        if entity == MatchingBonus:
            binds = _bind_params(stmt)
            rank_ids = [v for k, v in binds.items() if "rank_id" in k and isinstance(v, int)]
            matched = [b for b in self.bonus_rows if not rank_ids or b.rank_id in rank_ids]
            return _Row(matched[0] if matched else None, matched)
        if entity == RankHistory:
            return _Row(None, [])
        return _Row(None)

    async def get(self, cls, obj_id):
        from app.models.user import User
        from app.models.rank import Rank

        if cls == User:
            return self.user
        if cls == Rank:
            return RANK_BY_ID.get(obj_id)
        return None

    def add(self, obj):
        self.added.append(obj)
        if getattr(obj, "rank_id", None) is not None:
            self.bonus_rows.append(obj)

    async def flush(self):
        return None

    async def commit(self):
        return None

    async def refresh(self, *_a, **_k):
        return None


def _eval(user, *, personal, team, matching, kyc_approved=True,
          snapshot_volume=None, use_snapshot_volume=False, skip_bonus=False,
          bonus_rows=None):
    """Run the real evaluate_and_process_rank with only I/O seams mocked.

    ``_get_highest_qualified_rank`` and ``_has_rank_bonus_been_paid`` run their
    real implementations so outcomes match the live rank ladder.
    """
    db = _FakeDB(user, bonus_rows=bonus_rows)
    gtv = AsyncMock(return_value=(Decimal(personal), Decimal(team)))
    gmbv = AsyncMock(return_value=(Decimal(personal), Decimal(matching)))
    snap = Decimal(snapshot_volume) if snapshot_volume is not None else None

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)

        async def highest(volume, _db):
            qual = [r for r in RANKS if r.is_active and r.target_volume <= volume]
            return max(qual, key=lambda r: r.sort_order) if qual else None

        with patch("app.services.rank_service.is_kyc_approved",
                   AsyncMock(return_value=kyc_approved)), patch(
            "app.services.rank_service.get_team_volume", gtv
        ), patch(
            "app.services.rank_service.get_matching_bonus_volume", gmbv
        ), patch(
            "app.services.rank_service._get_highest_qualified_rank", highest
        ):
            return await rs.evaluate_and_process_rank(
                user_id=user.id,
                db=db,
                source_user_id=user.id,
                reference_id=100,
                reference_type="deposit",
                skip_bonus=skip_bonus,
                use_snapshot_volume=use_snapshot_volume,
                snapshot_volume=snap,
            )

    return asyncio.run(run()), db, gtv, gmbv, user


def _split_added(db):
    from app.models.matching_bonus import MatchingBonus
    from app.models.rank_history import RankHistory

    bonuses = [a for a in db.added if isinstance(a, MatchingBonus)]
    histories = [a for a in db.added if isinstance(a, RankHistory)]
    return bonuses, histories


# --- Reported scenario: 180 snapshot + 20 deposit = 200 -> Starter ---------

def test_reported_scenario_180_snapshot_plus_20_deposit_upgrades_to_starter():
    """Exact acceptance scenario: KYC-approved, Team Volume 180 (snapshot), a
    new approved deposit of 20. Accumulated = 200 = Starter -> Starter must be
    assigned AND persisted (current_rank_id + RankHistory at volume 200)."""
    user = _UserStub(1)
    user.kyc_approved_team_volume = Decimal("180")

    result, db, gtv, gmbv, user = _eval(
        user, personal="20", team="20", matching="20",
    )

    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 1
    assert user.current_rank_id == 1, "Starter must be persisted on the user"
    assert user.team_volume == Decimal("200"), (
        "user team_volume must reflect the accumulated 180 + 20"
    )

    bonuses, histories = _split_added(db)
    assert len(histories) == 1 and histories[0].rank_id == 1, (
        "a RankHistory row at the Starter rank must be created"
    )
    assert histories[0].team_volume == Decimal("200"), (
        "RankHistory must record the accumulated volume that earned the rank"
    )

    # Matching volume (20) is below the first rank threshold, so no bonus is
    # paid - the same scope-cap rule as a team-volume-only deposit. Pre-KYC
    # volume (180) generates no bonus either.
    assert bonuses == [], "no bonus when matching volume supports no rank"
    assert result["bonuses_paid"] == []
    assert user.matching_bonus_wallet == Decimal("0")


def test_displayed_volume_and_rank_now_agree():
    """After the fix, the stored team_volume (what /users/me reports) equals the
    lifetime Team Volume (/ranks/my-rank) AND the rank matches."""
    user = _UserStub(2)
    user.kyc_approved_team_volume = Decimal("180")
    result, db, _, _, user = _eval(user, personal="20", team="20", matching="20")
    assert user.team_volume == Decimal("200")
    assert user.current_rank_id == 1
    assert result["new_rank"] == 1


# --- Downline deposits upgrade a KYC-approved ancestor ----------------------

def test_downline_deposit_upgrades_kyc_ancestor_with_no_own_post_approval_deposit():
    """User A is KYC-approved with snapshot 180 and made no deposit after
    approval (personal_volume == 0). B, A's downline, deposits 20. A's
    accumulated volume = 200 -> A must be upgraded to Starter."""
    a = _UserStub(3)
    a.kyc_approved_team_volume = Decimal("180")

    result, db, gtv, gmbv, a = _eval(
        a, personal="0", team="20", matching="20",
    )
    assert result["rank_upgraded"] is True, (
        "a downline deposit must upgrade a KYC-approved ancestor"
    )
    assert result["new_rank"] == 1
    assert a.current_rank_id == 1
    assert a.team_volume == Decimal("200")


# --- Threshold boundaries: t-1 / t / t+1 ------------------------------------

def test_threshold_boundary_199_no_rank_200_rank_201_still_starter():
    ladder = RANKS[0]  # Starter target 200

    below = _UserStub(4)
    below.kyc_approved_team_volume = Decimal("180")
    r1, db1, _, _, below = _eval(below, personal="19", team="19", matching="19")
    assert r1["rank_upgraded"] is False
    assert below.current_rank_id is None
    assert below.team_volume == Decimal("199"), (
        "accumulated volume is still tracked even when below the threshold"
    )
    _, h1 = _split_added(db1)
    assert h1 == [], "no rank history below the threshold"

    exact = _UserStub(5)
    exact.kyc_approved_team_volume = Decimal("180")
    r2, db2, _, _, exact = _eval(exact, personal="20", team="20", matching="20")
    assert r2["rank_upgraded"] is True
    assert exact.current_rank_id == 1, "exactly at the threshold must rank up"
    assert exact.team_volume == Decimal("200")
    assert ladder.target_volume == Decimal("200")

    over = _UserStub(6)
    over.kyc_approved_team_volume = Decimal("180")
    r3, _, _, _, over = _eval(over, personal="21", team="21", matching="21")
    assert r3["rank_upgraded"] is True
    assert over.current_rank_id == 1, "just above the threshold stays Starter"
    assert over.team_volume == Decimal("201")


# --- Large jump: highest eligible rank, no duplicate bonus ------------------

def test_large_jump_assigns_highest_eligible_rank_and_pays_bands_once():
    """Snapshot 100 + fresh 10000 = 10100 -> highest eligible rank is Gold
    (1000). Bands [100, 300, 500] are bonused at 10% (matching volume 10000
    supports Gold). Global (20000) is not reached. Re-evaluation must not pay
    a second time."""
    user = _UserStub(7)
    user.kyc_approved_team_volume = Decimal("100")

    result, db, _, _, user = _eval(
        user, personal="10000", team="10000", matching="10000",
    )
    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 3, "Gold (1000) is the highest eligible rank"
    assert user.current_rank_id == 3
    assert user.team_volume == Decimal("10100")

    paid = result["bonuses_paid"]
    assert [p["rank_id"] for p in paid] == [1, 2, 3], (
        "Starter/Silver/Gold must each pay their band"
    )
    eligible = [Decimal(p["eligible_amount"]) for p in paid]
    assert eligible == [Decimal("100"), Decimal("300"), Decimal("500")], (
        "bands are snapshot-in-band deltas 100/300/500, got %r" % eligible
    )
    assert user.matching_bonus_wallet == Decimal("90"), "10% of 900"
    assert user.bonused_up_to == Decimal("1000")

    # Re-run with the same volume: every rank's bonus is already paid, so no
    # duplicate payouts and no re-upgrade.
    result2, db2, _, _, user2 = _eval(
        user, personal="10000", team="10000", matching="10000",
        bonus_rows=list(db.bonus_rows),
    )
    assert result2["bonuses_paid"] == [], (
        "re-evaluation must not pay a second bonus"
    )
    assert user2.matching_bonus_wallet == Decimal("90")
    assert user2.bonused_up_to == Decimal("1000")


# --- No post-approval movement is skipped (guard) ---------------------------

def test_no_post_approval_volume_since_snapshot_skips_evaluation():
    """When nothing has accumulated beyond the snapshot floor, evaluation
    short-circuits (no rank change possible)."""
    user = _UserStub(8)
    user.kyc_approved_team_volume = Decimal("180")

    result, db, gtv, gmbv, user = _eval(
        user, personal="0", team="0", matching="0",
    )
    assert result["rank_upgraded"] is False
    assert user.current_rank_id is None
    assert gmbv.await_count == 0, "matching volume must not be computed when nothing moved"


# --- KYC gate still runs first ----------------------------------------------

def test_pending_kyc_never_ranked_even_with_accumulated_200():
    user = _UserStub(9)
    user.kyc_approved_team_volume = Decimal("180")
    result, db, gtv, gmbv, user = _eval(
        user, personal="20", team="20", matching="20", kyc_approved=False,
    )
    assert result["rank_upgraded"] is False
    assert result["new_rank"] is None
    assert user.current_rank_id is None
    assert gtv.await_count == 0, "gate must block before any volume query"
    bonuses, histories = _split_added(db)
    assert bonuses == [] and histories == []


# --- KYC approval snapshot path still assigns from the full snapshot --------

def test_kyc_approval_snapshot_path_unchanged():
    """The KYC-approval path (use_snapshot_volume=True) still assigns the rank
    once from the full historical snapshot and pays no pre-KYC bonus.

    Note: in production admin.py stores kyc_approved_team_volume BEFORE calling
    evaluate (so the snapshot floor == snapshot volume). Every rank band is then
    0 -> the loop assigns the rank (last_achieved_rank) but, pre-existing
    behavior, creates no RankHistory rows. This fix does not change that."""
    user = _UserStub(10)
    user.kyc_approved_team_volume = Decimal("50000")
    result, db, gtv, gmbv, user = _eval(
        user, personal="0", team="0", matching="0",
        snapshot_volume="50000", use_snapshot_volume=True, skip_bonus=True,
    )
    assert result["rank_upgraded"] is True
    assert result["new_rank"] == 4
    assert user.current_rank_id == 4
    assert user.team_volume == Decimal("50000")
    bonuses, histories = _split_added(db)
    assert bonuses == [], "pre-KYC snapshot volume must generate no bonus"
    assert histories == [], (
        "bands are 0 once the snapshot floor is stored, so no history rows "
        "(pre-existing behavior)"
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
                import traceback
                print(f"FAIL {name}: {e}")
                traceback.print_exc()
    print(f"\nALL {len(passed)} RANK-UPDATE-AFTER-DEPOSIT TESTS PASSED")
