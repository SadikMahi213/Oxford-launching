"""Comprehensive regression tests for the KYC-first rank gate.

Business rule: a user whose KYC status is NOT 'approved' must never
  * hold / display any rank (dashboard must return null / empty)
  * be promoted or receive a matching bonus after a deposit
  * have team volume qualify them for a rank

Run with: python test_kyc_rank_gate_full.py
"""
import asyncio
import importlib
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

PRECISION = Decimal("0.00000000000001")


class _FakeScalars:
    def __init__(self, items=None):
        self._items = items or []

    def all(self):
        return self._items


class _FakeRow:
    def __init__(self, val, items=None):
        self.val = val
        self._items = items

    def scalar_one_or_none(self):
        return self.val

    def first(self):
        return self.val

    def fetchall(self):
        return []

    def scalars(self):
        return _FakeScalars(self._items)


class _FakeBonus:
    is_reversed = False
    reversed_at = None
    reversal_reason = None

    def __init__(self, amount):
        self.bonus_amount = amount


class _FakeHistory:
    status = "achieved"
    released_at = None


class _FakeUser:
    def __init__(self, user_id, *, rank_id=None, team_volume=None, wallet=None):
        self.id = user_id
        self.current_rank_id = rank_id
        self.team_volume = team_volume
        self.matching_bonus_wallet = wallet
        self.kyc_approved_at = None
        self.user_no = f"U{user_id}"


class _FakeDB:
    def __init__(self, user, bonuses=None, histories=None):
        self.user = user
        self.bonuses = bonuses or []
        self.histories = histories or []

    async def execute(self, stmt):
        text = str(stmt)
        if "matching_bonuses" in text:
            return _FakeRow(None, self.bonuses)
        if "rank_histories" in text:
            return _FakeRow(None, self.histories)
        return _FakeRow(self.user)

    async def get(self, *_a, **_k):
        return None

    async def commit(self):
        return None

    async def refresh(self, *_a, **_k):
        return None


def _eval_rank(user, kyc_approved, volume_cutover=None):
    db = _FakeDB(user)
    gtv = AsyncMock(return_value=(Decimal("500"), Decimal("500")))

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)
        with patch("app.services.rank_service.is_kyc_approved", AsyncMock(return_value=kyc_approved)), patch(
            "app.services.rank_service.get_team_volume", gtv
        ), patch("app.services.rank_service._get_highest_qualified_rank", AsyncMock(return_value=None)):
            result = await rs.evaluate_and_process_rank(user_id=user.id, db=db)
            return result, gtv

    return asyncio.run(run())


def test_pending_kyc_deposit_no_rank_no_bonus():
    user = _FakeUser(1)
    result, gtv = _eval_rank(user, kyc_approved=False)
    assert result["rank_upgraded"] is False
    assert result["bonuses_paid"] == []
    assert user.current_rank_id is None
    assert gtv.await_count == 0, "volume must not be consulted for non-approved users"


def test_rejected_kyc_deposit_no_rank_no_bonus():
    user = _FakeUser(2)
    result, gtv = _eval_rank(user, kyc_approved=False)
    assert result["rank_upgraded"] is False
    assert result["bonuses_paid"] == []
    assert gtv.await_count == 0


def test_approved_kyc_deposit_eligible():
    user = _FakeUser(3)
    result, gtv = _eval_rank(user, kyc_approved=True)
    assert gtv.await_count == 1, "approved users may be evaluated"
    assert "bonuses_paid" in result


def test_pending_to_approved_uses_lifetime_volume_for_rank():
    approved_at = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
    user = _FakeUser(4)
    user.kyc_approved_at = approved_at
    _, gtv = _eval_rank(user, kyc_approved=True)
    assert gtv.await_count == 1
    _, kwargs = gtv.call_args
    assert kwargs.get("cutover") is None, "rank evaluation must use lifetime volume (no cutover)"


def test_enforce_gate_strips_artifacts_for_rejected_user():
    user = _FakeUser(5, rank_id=9, team_volume=Decimal("3411"), wallet=Decimal("50"))
    bonuses = [_FakeBonus(Decimal("20")), _FakeBonus(Decimal("30"))]
    histories = [_FakeHistory(), _FakeHistory()]
    db = _FakeDB(user, bonuses=bonuses, histories=histories)

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)
        with patch("app.services.rank_service.is_kyc_approved", AsyncMock(return_value=False)):
            blocked = await rs.enforce_kyc_rank_gate(user, db)
        return blocked

    blocked = asyncio.run(run())
    assert blocked is True
    assert user.current_rank_id is None
    assert user.team_volume == Decimal("3411"), "team_volume must be preserved (volume always accumulates)"
    assert user.matching_bonus_wallet == Decimal("0")
    assert all(b.is_reversed for b in bonuses)
    assert all(h.status == "reversed" for h in histories)


def test_dashboard_my_rank_null_for_non_kyc():
    user = _FakeUser(6)
    db = _FakeDB(user)

    async def run():
        import app.api.v1.ranks as ranks_mod
        with patch("app.utils.kyc_helper.is_kyc_approved", AsyncMock(return_value=False)), patch(
            "app.services.rank_service.get_team_volume",
            AsyncMock(return_value=(Decimal("500"), Decimal("2000"))),
        ):
            return await ranks_mod.get_my_rank(db=db, current_user=user)

    payload = asyncio.run(run())
    assert payload["current_rank"] is None
    assert payload["next_rank"] is None
    # Team Volume still accumulates for pending users, but it can never grant a rank.
    assert payload["team_volume"] == "2000"
    assert payload["personal_volume"] == "500"
    assert payload["progress"] == 0.0
    assert payload.get("kyc_required") is True


def test_my_history_empty_for_non_kyc():
    user = _FakeUser(7)
    db = _FakeDB(user)

    async def run():
        import app.api.v1.ranks as ranks_mod
        with patch("app.utils.kyc_helper.is_kyc_approved", AsyncMock(return_value=False)):
            return await ranks_mod.get_my_rank_history(db=db, current_user=user)

    assert asyncio.run(run()) == []


def test_my_bonuses_empty_for_non_kyc():
    user = _FakeUser(8)
    db = _FakeDB(user)

    async def run():
        import app.api.v1.ranks as ranks_mod
        with patch("app.utils.kyc_helper.is_kyc_approved", AsyncMock(return_value=False)):
            return await ranks_mod.get_my_matching_bonuses(db=db, current_user=user)

    assert asyncio.run(run()) == []


def test_scheduler_recalc_never_grants_rank_to_non_kyc():
    user = _FakeUser(9)
    result, gtv = _eval_rank(user, kyc_approved=False)
    assert result["rank_upgraded"] is False
    assert gtv.await_count == 0, "recalculate path must also respect the gate"


def test_my_bonuses_eager_loads_rank_relationship():
    """/my-bonuses must eager-load the rank relationship so approved users can
    see rank_name without an async lazy load (MissingGreenlet 500)."""
    seen = []

    class CaptureDb:
        async def execute(self, stmt):
            seen.append(str(stmt))
            return _FakeRow(None, [])

    user = _FakeUser(10)

    async def run():
        import app.api.v1.ranks as ranks_mod
        with patch("app.utils.kyc_helper.is_kyc_approved", AsyncMock(return_value=True)):
            return await ranks_mod.get_my_matching_bonuses(
                page=1, limit=50, db=CaptureDb(), current_user=user
            )

    asyncio.run(run())
    assert seen, "endpoint must execute a query"
    text = seen[0]
    assert "LEFT OUTER JOIN" in text and "ranks" in text, (
        "my-bonuses must eager-load the rank relationship (joinedload)"
    )


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} KYC-RANK REGRESSION TESTS PASSED")
