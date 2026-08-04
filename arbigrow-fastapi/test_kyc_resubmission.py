"""Regression tests: rejected KYC must be resubmittable with full feedback.

Issue: when a user's KYC was REJECTED and the user submitted KYC again,
- the frontend only accepted the exact message "KYC submitted successfully",
  but the backend returns "KYC resubmitted successfully" for resubmissions, so
  the success handler (navigation / state refresh / success message) was
  skipped entirely - the user got no visible response;
- the backend reset the KYC record status to pending but never reset the
  admin-controlled user.admin_kyc_status, so the Admin Panel kept showing the
  user as rejected/issue and never surfaced the new review cycle.

Fix: submit_kyc now (a) returns a message the frontend already accepts by also
handling resubmission, and (b) resets user.admin_kyc_status to "pending" (and
clears an on_hold account) so the admin panel immediately shows the new
submission as pending. Wallet behaviour is unchanged: a refunded fee is
re-deducted exactly once; an already-paid fee is never charged again.

Run with: python test_kyc_resubmission.py
"""
import asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.api.v1.admin import _resolve_effective_status
from app.api.v1.kyc import submit_kyc
from app.models.kyc import DocumentType, KYCStatus, PaymentStatus
from app.models.wallet_transaction import (
    WalletTransaction,
    WalletTransactionStatus,
    WalletTransactionType,
)


class _FakeRow:
    def __init__(self, val):
        self.val = val

    def scalar_one_or_none(self):
        return self.val

    def first(self):
        return self.val


class _FakeConfig:
    def __init__(self, value):
        self.value = value


class _FakeFile:
    def __init__(self, content_type="image/jpeg"):
        self.content_type = content_type


class _FakeUser:
    def __init__(
        self,
        user_id,
        *,
        admin_kyc_status="rejected",
        deposit_wallet=Decimal(100),
        kyc_hold=Decimal(0),
        account_status="inactive",
        account_issue=None,
    ):
        self.id = user_id
        self.user_no = f"U{user_id}"
        self.full_name = "Test User"
        self.email = "test@example.com"
        self.account_status = account_status
        self.account_issue = account_issue
        self.admin_kyc_status = admin_kyc_status
        self.deposit_wallet = deposit_wallet
        self.kyc_hold = kyc_hold
        self.kyc_approved_at = None
        self.kyc_approved_team_volume = None
        self.parent_lvl_1_id = None


class _FakeKYC:
    def __init__(self, kyc_id, *, status=KYCStatus.rejected):
        self.id = kyc_id
        self.user_id = 1
        self.status = status
        self.admin_note = "Documents unclear"
        self.payment_status = PaymentStatus.refunded
        self.fee_paid = Decimal(10)
        self.full_name = "Old Name"
        self.country = "Bangladesh"
        self.phone_number = "+8801000000000"
        self.document_type = DocumentType.nid
        self.document_number = "OLD-12345"
        self.front_image_key = "kyc/1/old-front.jpg"
        self.back_image_key = "kyc/1/old-back.jpg"
        self.transaction_id = None
        self.fee_refunded = True
        self.fee_refunded_at = None


class _FakeDB:
    def __init__(self, kyc, user, *, configs=None):
        self.kyc = kyc
        self.user = user
        self.configs = list(configs or [])
        self.added = []
        self.commits = 0
        self.last_stmt = None

    async def execute(self, stmt):
        text = str(stmt)
        self.last_stmt = text
        if "kyc_verifications" in text:
            return _FakeRow(self.kyc)
        if "kyc_packages" in text:
            return _FakeRow(None)
        if "system_config" in text:
            cfg = self.configs.pop(0) if self.configs else None
            return _FakeRow(cfg)
        return _FakeRow(self.user)

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, WalletTransaction) and not getattr(obj, "id", None):
            obj.id = 1000 + len(self.added)

    async def commit(self):
        for obj in self.added:
            if obj.__class__.__name__ == "KYC" and getattr(obj, "status", None) is None:
                obj.status = KYCStatus.pending
        self.commits += 1

    async def refresh(self, obj, *_a, **_k):
        return None


def _run(db, *, content_type="image/jpeg", user_id=1):
    front = _FakeFile(content_type=content_type)
    back = _FakeFile(content_type=content_type)

    async def run():
        with patch(
            "app.api.v1.kyc.upload_to_b2", AsyncMock(return_value="kyc/1/new-front.jpg")
        ) as upload, patch(
            "app.api.v1.kyc.generate_presigned_url",
            MagicMock(return_value="https://example.com/kyc/1/new-front.jpg"),
        ) as presign, patch(
            "app.api.v1.kyc.notify_admin", AsyncMock()
        ) as notify:
            resp = await submit_kyc(
                request=None,
                full_name="New Name",
                country="Bangladesh",
                phone_number="+8801712345678",
                document_type=DocumentType.nid,
                document_number="NEW-99999",
                front_image=front,
                back_image=back,
                kyc_package_id=None,
                transaction_id="txn-resubmit",
                db=db,
                user_id=user_id,
            )
            return resp, upload, presign, notify

    return asyncio.run(run())


def _kyc_transactions(db, *types):
    return [
        obj
        for obj in db.added
        if isinstance(obj, WalletTransaction) and obj.type in types
    ]


def test_rejected_resubmit_resets_kyc_status_to_pending():
    user = _FakeUser(1)
    kyc = _FakeKYC(5)
    db = _FakeDB(kyc, user)
    resp, _, _, _ = _run(db)

    assert resp["message"] == "KYC resubmitted successfully"
    assert resp["status"] == "pending"
    assert kyc.status == "pending"
    assert kyc.admin_note is None, "rejection note must be cleared for the new cycle"
    assert kyc.full_name == "New Name"
    assert kyc.document_number == "NEW-99999"
    assert kyc.transaction_id == "txn-resubmit"


def test_rejected_resubmit_resets_admin_kyc_status_to_pending():
    user = _FakeUser(1, admin_kyc_status="rejected")
    kyc = _FakeKYC(5)
    db = _FakeDB(kyc, user)
    _run(db)

    assert user.admin_kyc_status == "pending"


def test_resubmit_clears_on_hold_account():
    user = _FakeUser(
        1,
        admin_kyc_status="rejected",
        account_status="on_hold",
        account_issue="Bad documents",
    )
    kyc = _FakeKYC(5)
    db = _FakeDB(kyc, user)
    _run(db)

    assert user.account_status == "inactive"
    assert user.account_issue is None


def test_resubmit_rededucts_refunded_fee_once():
    user = _FakeUser(1, deposit_wallet=Decimal(100), kyc_hold=Decimal(0))
    kyc = _FakeKYC(5)
    db = _FakeDB(kyc, user)
    resp, _, _, _ = _run(db)

    assert user.deposit_wallet == Decimal(90), "refunded fee must be re-deducted"
    assert user.kyc_hold == Decimal(10)
    assert kyc.payment_status == PaymentStatus.paid
    assert resp["fee_deducted"] == "10"

    holds = _kyc_transactions(db, WalletTransactionType.kyc_fee_hold)
    assert len(holds) == 1, "exactly one new hold transaction per resubmission"
    assert holds[0].status == WalletTransactionStatus.held
    assert holds[0].amount == Decimal(10)
    assert holds[0].reference_id == kyc.id


def test_resubmit_paid_fee_not_deducted_again():
    user = _FakeUser(1, deposit_wallet=Decimal(100), kyc_hold=Decimal(10))
    kyc = _FakeKYC(5)
    kyc.payment_status = PaymentStatus.paid
    db = _FakeDB(kyc, user)
    resp, _, _, _ = _run(db)

    assert user.deposit_wallet == Decimal(100), "paid fee must not be charged again"
    assert user.kyc_hold == Decimal(10)
    assert resp["fee_deducted"] == "0"
    assert _kyc_transactions(db, WalletTransactionType.kyc_fee_hold) == []


def test_resubmit_replaces_document_files():
    user = _FakeUser(1)
    kyc = _FakeKYC(5)
    db = _FakeDB(kyc, user)
    _, upload, presign, _ = _run(db)

    assert upload.await_count >= 1
    assert kyc.front_image_key == "kyc/1/new-front.jpg"
    assert kyc.back_image_key == "kyc/1/new-front.jpg"
    assert presign.call_count >= 1


def test_resubmit_sends_resubmitted_notification():
    user = _FakeUser(1)
    kyc = _FakeKYC(5)
    db = _FakeDB(kyc, user)
    _, _, _, notify = _run(db)

    assert notify.await_count == 1
    call = notify.call_args.kwargs
    assert call["type"] == "kyc_resubmitted"
    assert call["user_id"] == 1
    assert "resubmitted KYC" in call["message"]


def test_admin_effective_status_returns_pending_after_resubmit():
    # After resubmission: admin_kyc_status pending, KYC record pending,
    # account inactive (default). The Admin Panel must show "pending".
    status = _resolve_effective_status(
        account_status="inactive",
        kyc_status=KYCStatus.pending,
        admin_kyc_status="pending",
        email_verified=True,
    )
    assert status == "pending"


def test_first_submission_still_creates_pending_record():
    user = _FakeUser(2, admin_kyc_status="pending", deposit_wallet=Decimal(50))
    db = _FakeDB(None, user, configs=[_FakeConfig("true"), _FakeConfig("0")])
    front = _FakeFile()
    back = _FakeFile()

    async def run():
        with patch(
            "app.api.v1.kyc.upload_to_b2", AsyncMock(return_value="kyc/2/front.jpg")
        ), patch(
            "app.api.v1.kyc.generate_presigned_url", MagicMock(return_value="u")
        ), patch(
            "app.api.v1.kyc.notify_admin", AsyncMock()
        ) as notify:
            resp = await submit_kyc(
                request=None,
                full_name="First User",
                country="Bangladesh",
                phone_number="+8801711111111",
                document_type=DocumentType.nid,
                document_number="FIRST-1",
                front_image=front,
                back_image=back,
                kyc_package_id=None,
                transaction_id=None,
                db=db,
                user_id=2,
            )
            return resp, notify

    resp, notify = asyncio.run(run())
    assert resp["message"] == "KYC submitted successfully"
    assert getattr(resp["status"], "value", resp["status"]) == "pending"
    assert len(db.added) >= 1
    assert notify.await_count == 1
    assert notify.call_args.kwargs["type"] == "kyc_submitted"


def test_invalid_file_type_still_rejected():
    user = _FakeUser(1)
    kyc = _FakeKYC(5)
    db = _FakeDB(kyc, user)
    front = _FakeFile(content_type="text/plain")
    back = _FakeFile(content_type="image/jpeg")

    async def run():
        with patch("app.api.v1.kyc.notify_admin", AsyncMock()):
            try:
                await submit_kyc(
                    request=None,
                    full_name="New Name",
                    country="Bangladesh",
                    phone_number="+8801712345678",
                    document_type=DocumentType.nid,
                    document_number="NEW-99999",
                    front_image=front,
                    back_image=back,
                    kyc_package_id=None,
                    transaction_id=None,
                    db=db,
                    user_id=1,
                )
                return None
            except Exception as exc:  # noqa: BLE001
                return exc

    err = asyncio.run(run())
    assert err is not None
    assert getattr(err, "status_code", None) == 400


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} KYC RESUBMISSION TESTS PASSED")
