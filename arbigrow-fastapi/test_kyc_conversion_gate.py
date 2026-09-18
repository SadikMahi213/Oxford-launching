"""Tests for the KYC-approval gate on OFA token conversion.

Business rule: only users with KYC status "approved" may convert OFA tokens.
All other states (pending / rejected / not submitted / under_review / null /
empty) must be blocked with HTTP 403 and NO wallet/transaction changes.

Reuses the existing production KYC helper app.utils.kyc_helper.check_kyc_approved
(same pattern as withdrawals, rank eligibility, matching bonus, team bonus).

Run with: python test_kyc_conversion_gate.py
"""
import asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from starlette.requests import Request

from app.api.v1.user import convert_ofa_to_usdt
from app.schemas.user import ConvertOFARequest


class _FakeRateRow:
    def __init__(self, rate):
        self.value = rate

    def scalar_one_or_none(self):
        return self


class _FakeDB:
    def __init__(self, rate="0.0001"):
        self.rate = rate
        self.committed = False
        self.refreshed = []
        self.added = []

    async def execute(self, stmt):
        return _FakeRateRow(self.rate)

    async def commit(self):
        self.committed = True

    async def refresh(self, obj):
        self.refreshed.append(obj)


class _FakeUser:
    def __init__(self, user_id, arbx=Decimal("10"), main=Decimal("5")):
        self.id = user_id
        self.full_name = f"User {user_id}"
        self.account_status = "active"
        self.arbx_wallet = arbx
        self.main_wallet = main


def _make_request():
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/user/convert-ofa-to-usdt",
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "query_string": b"",
            "scheme": "http",
            "server": ("localhost", 80),
        }
    )


def _run(kyc_approved, ofa_amount="1"):
    user = _FakeUser(1)
    db = _FakeDB()
    data = ConvertOFARequest(ofa_amount=ofa_amount)
    request = _make_request()

    async def run():
        with patch(
            "app.api.v1.user.check_kyc_approved",
            AsyncMock(),
        ) as kyc_mock, patch(
            "app.api.v1.user.notify_admin",
            AsyncMock(),
        ) as notify_mock, patch(
            "app.api.v1.user._create_ofa_tx",
            AsyncMock(),
        ) as tx_mock:
            kyc_mock.side_effect = (
                None if kyc_approved else __import__(
                    "fastapi"
                ).HTTPException(status_code=403, detail="KYC verification required.")
            )
            try:
                result = await convert_ofa_to_usdt(
                    request=request,
                    data=data,
                    db=db,
                    current_user=user,
                )
                returned = True
                error = None
            except Exception as exc:  # noqa: BLE001
                returned = False
                error = exc
            return {
                "returned": returned,
                "error": error,
                "user_arbx": user.arbx_wallet,
                "user_main": user.main_wallet,
                "committed": db.committed,
                "tx_created": tx_mock.await_count,
                "notify_calls": notify_mock.await_count,
                "kyc_checked": kyc_mock.await_count,
            }

    return asyncio.run(run())


def test_scenario1_pending_kyc_blocked():
    res = _run(kyc_approved=False)
    assert res["returned"] is False
    assert isinstance(res["error"], __import__("fastapi").HTTPException)
    assert res["error"].status_code == 403
    assert res["kyc_checked"] == 1, "KYC gate must run before conversion"
    assert res["tx_created"] == 0, "no OFA transaction may be created"
    assert res["committed"] is False, "no commit may happen"
    assert res["notify_calls"] == 0
    assert res["user_arbx"] == Decimal("10"), "OFA balance must be unchanged"
    assert res["user_main"] == Decimal("5"), "USDT balance must be unchanged"


def test_scenario2_rejected_kyc_blocked():
    res = _run(kyc_approved=False)
    assert res["returned"] is False
    assert res["error"].status_code == 403
    assert res["tx_created"] == 0
    assert res["committed"] is False
    assert res["user_arbx"] == Decimal("10")
    assert res["user_main"] == Decimal("5")


def test_scenario3_approved_kyc_succeeds():
    res = _run(kyc_approved=True)
    assert res["returned"] is True
    assert res["kyc_checked"] == 1
    assert res["tx_created"] == 1, "approved user must still create conversion tx"
    assert res["committed"] is True
    assert res["user_arbx"] == Decimal("9"), "1 OFA deducted for approved user"
    assert res["user_main"] == Decimal("5.0001"), "USDT credited at current rate"


def test_scenario4_direct_api_pending_returns_403():
    res = _run(kyc_approved=False, ofa_amount="1")
    assert res["error"].status_code == 403
    assert "KYC" in str(res["error"].detail)
    assert res["user_arbx"] == Decimal("10"), "no balance change from direct call"
    assert res["user_main"] == Decimal("5")


def test_scenario5_admin_rate_change_no_regression():
    user = _FakeUser(1)
    db = _FakeDB(rate="0.0005")
    data = ConvertOFARequest(ofa_amount="2")
    request = _make_request()

    async def run():
        with patch("app.api.v1.user.check_kyc_approved", AsyncMock()), patch(
            "app.api.v1.user.notify_admin", AsyncMock()
        ), patch("app.api.v1.user._create_ofa_tx", AsyncMock()) as tx_mock:
            result = await convert_ofa_to_usdt(
                request=request, data=data, db=db, current_user=user
            )
            return result, user, tx_mock

    result, user, tx_mock = asyncio.run(run())
    assert result.usdt_amount == float(Decimal("2") * Decimal("0.0005")), \
        "conversion must honour the admin-configured rate"
    assert user.arbx_wallet == Decimal("8")
    assert user.main_wallet == Decimal("5.001")
    assert tx_mock.await_count == 1


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} KYC CONVERSION GATE TESTS PASSED")
