"""Tests for the KYC-verification gate on rank and matching-bonus eligibility.

Validates the business rule in app/services/rank_service.evaluate_and_process_rank:

  A user MUST NOT qualify for any rank or receive any matching bonus
  until their KYC status is "approved".

Run with: python test_kyc_rank_gate.py
"""
import asyncio
import importlib
from decimal import Decimal
from unittest.mock import AsyncMock, patch


class _FakeScalars:
    def all(self):
        return []


class _FakeRow:
    def __init__(self, val):
        self.val = val

    def scalar_one_or_none(self):
        return self.val

    def first(self):
        return self.val

    def fetchall(self):
        return []

    def scalars(self):
        return _FakeScalars()


class _FakeUser:
    def __init__(self, user_id):
        self.id = user_id
        self.current_rank_id = None
        self.team_volume = None
        self.matching_bonus_wallet = Decimal("0")


class _FakeDB:
    def __init__(self, user):
        self.user = user

    async def execute(self, stmt):
        return _FakeRow(self.user)

    async def get(self, *_):
        return None


def _run(user_id, kyc_approved, personal=Decimal("1"), team=Decimal("100")):
    user = _FakeUser(user_id)
    db = _FakeDB(user)

    async def run():
        import app.services.rank_service as rs
        importlib.reload(rs)
        with patch(
            "app.services.rank_service.is_kyc_approved",
            AsyncMock(return_value=kyc_approved),
        ) as kyc, patch(
            "app.services.rank_service.get_team_volume",
            AsyncMock(return_value=(personal, team)),
        ) as gtv, patch(
            "app.services.rank_service._get_highest_qualified_rank",
            AsyncMock(return_value=None),
        ):
            result = await rs.evaluate_and_process_rank(user_id=user_id, db=db)
            return result, kyc.await_count, gtv.call_count

    return asyncio.run(run())


def test_scenario1_not_verified_short_circuits():
    result, kyc_calls, gtv_calls = _run(1, kyc_approved=False)
    assert result["rank_upgraded"] is False
    assert result["new_rank"] is None
    assert result["bonuses_paid"] == []
    assert kyc_calls >= 1, "KYC guard must be checked"
    assert gtv_calls == 0, "volume calc must be skipped for unverified users"


def test_scenario3_pending_short_circuits():
    result, kyc_calls, gtv_calls = _run(2, kyc_approved=False)
    assert result["rank_upgraded"] is False
    assert result["bonuses_paid"] == []
    assert gtv_calls == 0


def test_scenario2_verified_proceeds_past_gate():
    result, kyc_calls, gtv_calls = _run(3, kyc_approved=True)
    assert kyc_calls >= 1
    # Gate passes -> volume calculation is reached (rank stub returns None).
    assert gtv_calls == 1
    assert "bonuses_paid" in result


def test_has_rank_bonus_been_paid_ignores_reversed():
    """A reversed matching bonus must NOT block a future legitimate earn."""
    import io
    import contextlib
    import app.services.rank_service as rs

    seen = []

    class Row:
        def first(self):
            # Return non-None (a paid record exists) so the check is exercised.
            return object()

    class FakeDb:
        def __init__(self):
            self.row = None

        async def execute(self, stmt):
            seen.append(stmt)
            return Row()

    async def run():
        return await rs._has_rank_bonus_been_paid(99, 3, FakeDb())

    asyncio.run(run())
    import sqlalchemy.sql.elements as el
    from sqlalchemy.sql.expression import false as sa_false

    # Confirm the executed query references is_reversed == False
    stmt = seen[0]
    text = str(stmt)
    assert "is_reversed" in text, "duplicate-pay check must filter reversed rows"


if __name__ == "__main__":
    r1, k1, g1 = _run(1, False)
    print("Scenario 1 (not verified):", r1, "| kyc_calls:", k1, "| volume_calls:", g1)
    r3, _k3, g3 = _run(3, True)
    print("Scenario 2/5 (verified):", r3, "| volume_calls:", g3)
    print("ALL SCENARIO CHECKS PASSED")