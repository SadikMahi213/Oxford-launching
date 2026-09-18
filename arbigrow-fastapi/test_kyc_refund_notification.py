"""Regression tests for the KYC-rejection refund notification.

Issue: when an admin rejects a user's KYC (triggering a USD refund to the
deposit wallet), no notification about the refund was created/surfaced.

Fix: update_kyc_status now enriches the existing kyc_rejected notification with
the refunded amount, wallet name, timestamp, and wallet-transaction reference.

Run with: python test_kyc_refund_notification.py
"""
import asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from app.api.v1.admin import update_kyc_status
from app.models.kyc import KYCStatus, PaymentStatus
from app.models.wallet_transaction import WalletTransaction
from app.schemas.admin import UpdateKYCStatusRequest


class _FakeRow:
    def __init__(self, val):
        self.val = val

    def scalar_one_or_none(self):
        return self.val

    def first(self):
        return self.val


class _FakeUser:
    def __init__(self, user_id, *, kyc_hold=Decimal(0), deposit_wallet=Decimal(0)):
        self.id = user_id
        self.user_no = f"U{user_id}"
        self.full_name = "Test User"
        self.email = "test@example.com"
        self.account_status = "active"
        self.account_issue = None
        self.admin_kyc_status = None
        self.kyc_hold = kyc_hold
        self.deposit_wallet = deposit_wallet
        self.kyc_approved_at = None
        self.kyc_approved_team_volume = None
        self.parent_lvl_1_id = None


class _FakeKYC:
    def __init__(self, kyc_id, status=KYCStatus.approved):
        self.id = kyc_id
        self.user_id = 1
        self.status = status
        self.admin_note = None
        self.payment_status = PaymentStatus.pending
        self.fee_refunded = False
        self.fee_refunded_at = None


class _FakeDB:
    def __init__(self, user, kyc):
        self.user = user
        self.kyc = kyc
        self.added = []
        self.commits = 0

    async def execute(self, stmt):
        text = str(stmt)
        if "kyc_verifications" in text:
            return _FakeRow(self.kyc)
        if "company_wallet" in text:
            return _FakeRow(None)
        return _FakeRow(self.user)

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, WalletTransaction) and not getattr(obj, "id", None):
            obj.id = 1000 + len(self.added)

    async def commit(self):
        self.commits += 1

    async def refresh(self, obj, *_a, **_k):
        return None

    async def get(self, *_a, **_k):
        return None


def _run(user, kyc, payload, *, gate_ok=True):
    db = _FakeDB(user, kyc)

    async def run():
        with patch("app.api.v1.admin.notify_admin", AsyncMock()) as notify, patch(
            "app.services.rank_service.enforce_kyc_rank_gate",
            AsyncMock(return_value=gate_ok),
        ):
            await update_kyc_status(
                user_id=user.id,
                payload=payload,
                request=None,
                db=db,
                current_admin=None,
            )
            return notify

    return asyncio.run(run()), db


def test_rejection_with_refund_creates_refund_notification():
    user = _FakeUser(1, kyc_hold=Decimal(10), deposit_wallet=Decimal(100))
    kyc = _FakeKYC(5, status=KYCStatus.approved)
    notify, _db = _run(user, kyc, UpdateKYCStatusRequest(status="rejected"))

    # Wallet refund happens
    assert user.deposit_wallet == Decimal(110), "deposit wallet must be credited"
    assert user.kyc_hold == Decimal(0)
    assert kyc.fee_refunded is True

    # Notification created through the existing system
    assert notify.await_count == 1, "one notification must be created"
    call = notify.call_args.kwargs
    assert call["type"] == "kyc_rejected"
    assert call["user_id"] == 1

    # Message includes amount, wallet name, reference and timestamp
    assert "Refund of $10.00" in call["message"]
    assert "Deposit Wallet" in call["message"]
    assert "Ref #" in call["message"]
    assert "UTC" in call["message"]

    meta = call["metadata_dict"]
    assert meta is not None
    assert meta["refund_amount"] == "10"
    assert meta["refund_wallet"] == "deposit_wallet"
    assert meta["refund_wallet_label"] == "Deposit Wallet"
    assert meta["refund_txn_id"]
    assert meta["refund_kyc_id"] == 5
    assert meta["refunded_at"]


def test_rejection_without_hold_has_no_refund_text():
    user = _FakeUser(2, kyc_hold=Decimal(0), deposit_wallet=Decimal(0))
    kyc = _FakeKYC(6, status=KYCStatus.approved)
    notify, _db = _run(user, kyc, UpdateKYCStatusRequest(status="rejected"))

    assert notify.await_count == 1
    call = notify.call_args.kwargs
    assert call["type"] == "kyc_rejected"
    assert "Refund of" not in call["message"]
    assert call["metadata_dict"] is None


def test_issue_flag_refund_notification():
    user = _FakeUser(3, kyc_hold=Decimal(20), deposit_wallet=Decimal(50))
    kyc = _FakeKYC(7, status=KYCStatus.approved)
    notify, _db = _run(user, kyc, UpdateKYCStatusRequest(status="issue", issue_note="bad docs"))

    assert user.deposit_wallet == Decimal(70), "issue flag must refund the hold"
    assert notify.await_count == 1
    call = notify.call_args.kwargs
    assert call["type"] == "kyc_rejected"
    assert "Refund of $20.00" in call["message"]
    assert "Deposit Wallet" in call["message"]
    assert call["metadata_dict"]["refund_amount"] == "20"


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} KYC REFUND NOTIFICATION TESTS PASSED")
