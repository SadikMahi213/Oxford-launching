"""Regression tests: KYC refund transactions must appear in the user's
transaction history via the new GET /api/v1/user/wallet-transactions endpoint.

Issue: WalletTransaction rows were written on every KYC hold/refund/release but
no endpoint ever read them back, so a KYC refund never showed up in the user's
Transaction History, API responses, or anywhere else.

Fix: GET /user/wallet-transactions returns the current user's WalletTransaction
rows (KYC fee holds, refunds, releases). The frontend merges the hold (debit)
and refund (credit) rows into the Transaction History so the deposit-wallet
balance reconciles exactly: -fee (hold) + fee (refund) = 0 for rejected/reset,
-fee only for approved.

Run with: python test_kyc_refund_history.py
"""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from app.api.v1.admin import update_kyc_status
from app.api.v1.user import get_my_wallet_transactions
from app.models.kyc import KYCStatus, PaymentStatus
from app.models.wallet_transaction import (
    WalletTransaction,
    WalletTransactionType,
    WalletTransactionStatus,
)
from app.schemas.admin import UpdateKYCStatusRequest

TS = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)


def _wt(
    txn_id,
    user_id,
    txn_type,
    amount,
    *,
    wallet_type="kyc_hold",
    status=WalletTransactionStatus.refunded,
    ref_id=None,
    before=None,
    after=None,
    created=TS,
):
    return WalletTransaction(
        id=txn_id,
        user_id=user_id,
        type=txn_type,
        wallet_type=wallet_type,
        amount=amount,
        balance_before=before,
        balance_after=after,
        reference_type="kyc",
        reference_id=ref_id,
        description="txn",
        status=status,
        created_at=created,
    )


class _FakeCurrentUser:
    def __init__(self, user_id):
        self.id = user_id


class _FakeEndpointResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        class _Scalars:
            def __init__(self, rows):
                self._rows = rows

            def all(self):
                return self._rows

        return _Scalars(self._rows)


class _FakeEndpointDB:
    def __init__(self, rows, total, *, offset=0, limit=20):
        self._rows = rows
        self._total = total
        self._offset = offset
        self._limit = limit
        self.last_stmt = None

    async def scalar(self, stmt, *_a, **_k):
        self.last_stmt = str(stmt)
        return self._total

    async def execute(self, stmt, *_a, **_k):
        self.last_stmt = str(stmt)
        return _FakeEndpointResult(self._rows[self._offset : self._offset + self._limit])


# ── Endpoint tests ────────────────────────────────────────────────────────


def _call_endpoint(rows, total, *, page=1, limit=20, user_id=7):
    db = _FakeEndpointDB(rows, total, offset=(page - 1) * limit, limit=limit)

    async def run():
        return await get_my_wallet_transactions(
            page=page, limit=limit, db=db, current_user=_FakeCurrentUser(user_id)
        )

    return asyncio.run(run()), db


def test_endpoint_returns_refund_rows():
    rows = [
        _wt(
            11, 7, WalletTransactionType.kyc_fee_refund, Decimal("10"),
            ref_id=5, before=Decimal("10"), after=Decimal("0"),
        ),
        _wt(
            10, 7, WalletTransactionType.kyc_fee_hold, Decimal("10"),
            wallet_type="deposit_wallet", status=WalletTransactionStatus.held,
            before=Decimal("100"), after=Decimal("90"),
        ),
    ]
    resp, _ = _call_endpoint(rows, total=2)
    assert resp["total"] == 2
    assert resp["page"] == 1
    assert len(resp["data"]) == 2

    refund = resp["data"][0]
    assert refund["id"] == 11
    assert refund["transaction_id"] == 11
    assert refund["user_id"] == 7
    assert refund["type"] == "kyc_fee_refund"
    assert refund["status"] == "refunded"
    assert refund["wallet_type"] == "kyc_hold"
    assert refund["amount"] == 10.0
    assert refund["balance_before"] == 10.0
    assert refund["balance_after"] == 0.0
    assert refund["currency"] == "USDT"
    assert refund["reference_type"] == "kyc"
    assert refund["reference_id"] == 5
    assert refund["created_at"] == "2026-08-01T12:00:00+00:00"

    hold = resp["data"][1]
    assert hold["type"] == "kyc_fee_hold"
    assert hold["wallet_type"] == "deposit_wallet"
    assert hold["balance_after"] == 90.0


def test_endpoint_scopes_query_to_current_user():
    rows = [_wt(11, 7, WalletTransactionType.kyc_fee_refund, Decimal("10"))]
    _, db = _call_endpoint(rows, total=1)
    assert "wallet_transactions" in db.last_stmt
    assert "user_id" in db.last_stmt


def test_endpoint_paginates():
    rows = [
        _wt(13, 7, WalletTransactionType.kyc_fee_refund, Decimal("10"), created=TS.replace(hour=13)),
        _wt(12, 7, WalletTransactionType.kyc_fee_refund, Decimal("10"), created=TS.replace(hour=12)),
        _wt(11, 7, WalletTransactionType.kyc_fee_refund, Decimal("10"), created=TS.replace(hour=11)),
    ]
    resp, _ = _call_endpoint(rows, total=3, page=2, limit=1)
    assert resp["total"] == 3
    assert resp["page"] == 2
    assert len(resp["data"]) == 1
    assert resp["data"][0]["id"] == 12


def test_endpoint_empty():
    resp, _ = _call_endpoint([], total=0)
    assert resp["total"] == 0
    assert resp["data"] == []


# ── Refund write-path tests ───────────────────────────────────────────────


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
        with patch("app.api.v1.admin.notify_admin", AsyncMock()), patch(
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
            return None

    asyncio.run(run())
    return db


def _refund_rows(*dbs, type=None):
    types = (WalletTransactionType.kyc_fee_refund, WalletTransactionType.kyc_fee_reset_refund)
    rows = []
    for db in dbs:
        for obj in db.added:
            if isinstance(obj, WalletTransaction) and (type is None or obj.type == type):
                if type is None and obj.type not in types:
                    continue
                rows.append(obj)
    return rows


def test_rejection_records_single_refund_row():
    user = _FakeUser(1, kyc_hold=Decimal(10), deposit_wallet=Decimal(100))
    kyc = _FakeKYC(5, status=KYCStatus.approved)
    db = _run(user, kyc, UpdateKYCStatusRequest(status="rejected"))

    rows = _refund_rows(db)
    assert len(rows) == 1, "exactly one refund row per rejection"
    row = rows[0]
    assert row.type == WalletTransactionType.kyc_fee_refund
    assert row.status == WalletTransactionStatus.refunded
    assert row.amount == Decimal(10)
    assert row.wallet_type == "kyc_hold"
    assert row.user_id == 1
    assert row.reference_type == "kyc"
    assert row.reference_id == 5


def test_reset_records_single_reset_refund_row():
    user = _FakeUser(2, kyc_hold=Decimal(25), deposit_wallet=Decimal(50))
    kyc = _FakeKYC(6, status=KYCStatus.approved)
    db = _run(user, kyc, UpdateKYCStatusRequest(status="pending"))

    rows = _refund_rows(db)
    assert len(rows) == 1
    assert rows[0].type == WalletTransactionType.kyc_fee_reset_refund
    assert rows[0].status == WalletTransactionStatus.refunded
    assert rows[0].amount == Decimal(25)


def test_issue_records_single_refund_row():
    user = _FakeUser(3, kyc_hold=Decimal(20), deposit_wallet=Decimal(50))
    kyc = _FakeKYC(7, status=KYCStatus.approved)
    db = _run(user, kyc, UpdateKYCStatusRequest(status="issue", issue_note="bad docs"))

    rows = _refund_rows(db)
    assert len(rows) == 1
    assert rows[0].type == WalletTransactionType.kyc_fee_refund
    assert rows[0].status == WalletTransactionStatus.refunded
    assert rows[0].amount == Decimal(20)


def test_sequential_rejections_record_one_row_each_no_duplicates():
    user = _FakeUser(4, kyc_hold=Decimal(10), deposit_wallet=Decimal(90))
    kyc = _FakeKYC(8, status=KYCStatus.approved)

    db1 = _run(user, kyc, UpdateKYCStatusRequest(status="rejected"))
    assert user.deposit_wallet == Decimal(100)

    # Simulate the user re-submitting KYC (fee re-deducted onto a new hold)
    user.kyc_hold = Decimal(10)
    user.deposit_wallet = Decimal(90)
    kyc.status = KYCStatus.approved
    kyc.payment_status = PaymentStatus.paid

    db2 = _run(user, kyc, UpdateKYCStatusRequest(status="rejected"))

    rows = _refund_rows(db1, db2)
    assert len(rows) == 2, "one refund row per rejection, never duplicated"
    assert len({id(r) for r in rows}) == 2, "both refund rows must be distinct"
    assert all(r.type == WalletTransactionType.kyc_fee_refund for r in rows)
    assert all(r.amount == Decimal(10) for r in rows)


def test_deposit_balance_reconciles_with_wallet_transactions():
    # Hold event: user paid 10 from a 100 deposit wallet.
    deposit_before_hold = Decimal(100)
    hold_amount = Decimal(10)
    user = _FakeUser(5, kyc_hold=hold_amount, deposit_wallet=deposit_before_hold - hold_amount)
    kyc = _FakeKYC(9, status=KYCStatus.approved)
    db = _run(user, kyc, UpdateKYCStatusRequest(status="rejected"))

    rows = _refund_rows(db)
    assert len(rows) == 1
    refund_amount = rows[0].amount

    # deposit_wallet after refund: 90 -> 100
    assert user.deposit_wallet == deposit_before_hold
    # signed wallet-tx sum (hold -10, refund +10) must equal the deposit delta
    assert (user.deposit_wallet - deposit_before_hold) == (refund_amount - hold_amount)


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} KYC REFUND HISTORY TESTS PASSED")
