"""KYC resubmission wallet accounting (Phase 9).

Verifies the separate Admin KYC Resubmission Wallet using fakes:
  TEST 1 - First KYC submit: kyc_fee_hold txn, submission_count == 1,
           no CompanyWallet touch at submit time.
  TEST 2 - Reject: refund txn, deposit restored, no resubmission credit.
  TEST 3 - Resubmit: kyc_resubmission_fee_hold txn, count 2, refund flags
           cleared, deposit 100 -> 90.
  TEST 4 - Approve after resubmit: hold released to the RESUBMISSION wallet
           only; first-KYC bucket untouched.
  TEST 5 - Approve first submit: hold released to the FIRST-KYC bucket only.
  TEST 6 - Multiple reject/refund/resubmit cycles reconcile exactly once each.
  TEST 7 - Duplicate retry (second resubmit call): no second charge.
  TEST 8 - Ledger maps the new resubmission types to their own category.
"""
import asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.api.v1.kyc import submit_kyc
from app.api.v1.admin import update_kyc_status
from app.models.company_wallet import CompanyWallet
from app.models.kyc import DocumentType, KYCStatus, PaymentStatus
from app.models.wallet_transaction import (
    WalletTransaction,
    WalletTransactionStatus,
    WalletTransactionType,
)
from app.schemas.admin import UpdateKYCStatusRequest


class _Row:
    def __init__(self, val):
        self.val = val

    def scalar_one_or_none(self):
        return self.val


class _File:
    def __init__(self, content_type="image/jpeg"):
        self.content_type = content_type


class _User:
    def __init__(self, uid, *, deposit=Decimal(100), hold=Decimal(0)):
        self.id = uid
        self.user_no = f"U{uid}"
        self.full_name = "Test User"
        self.email = "test@example.com"
        self.username = "testuser"
        self.profile_image_url = "img.jpg"
        self.account_status = "inactive"
        self.account_issue = None
        self.admin_kyc_status = "pending"
        self.deposit_wallet = deposit
        self.kyc_hold = hold
        self.kyc_approved_at = None
        self.kyc_approved_team_volume = None
        self.bonused_up_to = Decimal(0)
        self.parent_lvl_1_id = None


class _KYC:
    def __init__(self, kid, *, status=KYCStatus.rejected, payment=PaymentStatus.refunded,
                 fee=Decimal(10), count=1, refunded=True):
        self.id = kid
        self.user_id = 1
        self.status = status
        self.admin_note = "unclear" if status == KYCStatus.rejected else None
        self.payment_status = payment
        self.fee_paid = fee
        self.fee_refunded = refunded
        self.fee_refunded_at = None
        self.submission_count = count
        self.full_name = "Old"
        self.country = "BD"
        self.phone_number = "1"
        self.document_type = DocumentType.nid
        self.document_number = "OLD"
        self.front_image_key = "k/old.jpg"
        self.back_image_key = "k/old-b.jpg"
        self.transaction_id = None


class _Cfg:
    def __init__(self, value):
        self.value = value


class _DB:
    def __init__(self, kyc, user, *, company=None, configs=None):
        self.kyc = kyc
        self.user = user
        self.company = company
        self.configs = list(configs or [])
        self.added = []

    async def execute(self, stmt):
        t = str(stmt)
        if "kyc_verifications" in t:
            return _Row(self.kyc)
        if "company_wallet" in t:
            return _Row(self.company)
        if "system_config" in t:
            return _Row(self.configs.pop(0) if self.configs else None)
        if "kyc_packages" in t:
            return _Row(None)
        return _Row(self.user)

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, WalletTransaction) and not getattr(obj, "id", None):
            obj.id = 1000 + len(self.added)

    async def commit(self):
        self.commits = getattr(self, "commits", 0) + 1

    async def refresh(self, obj, *_a, **_k):
        return None

    async def get(self, *_a, **_k):
        return None


def _txns(db, *types):
    return [o for o in db.added if isinstance(o, WalletTransaction) and o.type in types]


def _resubmit(db, user_id=1):
    async def run():
        with patch("app.api.v1.kyc.upload_to_b2", AsyncMock(return_value="k/new.jpg")), patch(
            "app.api.v1.kyc.generate_presigned_url", MagicMock(return_value="u")
        ), patch("app.api.v1.kyc.notify_admin", AsyncMock()):
            return await submit_kyc(
                request=None, full_name="N", country="BD", phone_number="1",
                document_type=DocumentType.nid, document_number="N1",
                front_image=_File(), back_image=_File(),
                kyc_package_id=None, transaction_id="tx", db=db, user_id=user_id,
            )

    return asyncio.run(run())


def _approve(db, user, kyc, hold):
    user.kyc_hold = hold
    kyc.status = KYCStatus.pending
    kyc.payment_status = PaymentStatus.paid
    kyc.fee_refunded = False

    async def run():
        with patch("app.api.v1.admin.notify_admin", AsyncMock()), patch(
            "app.services.rank_service.get_team_volume", AsyncMock(return_value=(Decimal(0), Decimal(0)))
        ), patch("app.services.rank_service.evaluate_and_process_rank", AsyncMock()):
            return await update_kyc_status(
                user_id=user.id, payload=UpdateKYCStatusRequest(status="approved"),
                request=None, db=db, current_admin=None,
            )

    return asyncio.run(run())


def _reject(db, user, kyc, hold):
    user.kyc_hold = hold
    user.admin_kyc_status = "pending"
    kyc.status = KYCStatus.pending
    kyc.payment_status = PaymentStatus.paid
    kyc.fee_refunded = False

    async def run():
        with patch("app.api.v1.admin.notify_admin", AsyncMock()), patch(
            "app.services.rank_service.enforce_kyc_rank_gate", AsyncMock()
        ):
            return await update_kyc_status(
                user_id=user.id, payload=UpdateKYCStatusRequest(status="rejected"),
                request=None, db=db, current_admin=None,
            )

    return asyncio.run(run())


def _company(db):
    cws = [o for o in db.added if isinstance(o, CompanyWallet)]
    assert cws, "CompanyWallet must be created on approve"
    return cws[0]


class TestResubmissionWallet:
    def test_1_first_submit_uses_first_kyc_type(self):
        user = _User(1, deposit=Decimal(100), hold=Decimal(0))
        db = _DB(None, user, configs=[_Cfg("true"), _Cfg("10")])

        async def run():
            with patch("app.api.v1.kyc.upload_to_b2", AsyncMock(return_value="k/1.jpg")), patch(
                "app.api.v1.kyc.generate_presigned_url", MagicMock(return_value="u")
            ), patch("app.api.v1.kyc.notify_admin", AsyncMock()):
                return await submit_kyc(
                    request=None, full_name="N", country="BD", phone_number="1",
                    document_type=DocumentType.nid, document_number="N1",
                    front_image=_File(), back_image=_File(),
                    kyc_package_id=None, transaction_id=None, db=db, user_id=1,
                )

        resp = asyncio.run(run())
        assert resp["fee_deducted"] == "10"
        assert user.deposit_wallet == Decimal(90)
        assert user.kyc_hold == Decimal(10)
        holds = _txns(db, WalletTransactionType.kyc_fee_hold)
        assert len(holds) == 1 and holds[0].amount == Decimal(10)
        assert _txns(db, WalletTransactionType.kyc_resubmission_fee_hold) == []
        kycs = [o for o in db.added if o.__class__.__name__ == "KYC"]
        assert kycs and kycs[0].submission_count == 1

    def test_2_reject_refunds_without_resub_credit(self):
        user = _User(1, deposit=Decimal(90), hold=Decimal(10))
        kyc = _KYC(5, status=KYCStatus.pending, payment=PaymentStatus.paid, refunded=False)
        db = _DB(kyc, user)
        _reject(db, user, kyc, Decimal(10))
        assert user.deposit_wallet == Decimal(100)
        assert user.kyc_hold == Decimal(0)
        assert kyc.payment_status == PaymentStatus.refunded
        assert len(_txns(db, WalletTransactionType.kyc_fee_refund)) == 1
        assert [o for o in db.added if isinstance(o, CompanyWallet)] == []

    def test_3_resubmit_creates_resubmission_hold(self):
        user = _User(1, deposit=Decimal(100), hold=Decimal(0))
        kyc = _KYC(5)
        db = _DB(kyc, user)
        resp = _resubmit(db)
        assert resp["fee_deducted"] == "10"
        assert user.deposit_wallet == Decimal(90)
        assert user.kyc_hold == Decimal(10)
        assert kyc.submission_count == 2
        assert kyc.fee_refunded is False
        holds = _txns(db, WalletTransactionType.kyc_resubmission_fee_hold)
        assert len(holds) == 1 and holds[0].amount == Decimal(10)
        assert _txns(db, WalletTransactionType.kyc_fee_hold) == []

    def test_4_approve_after_resubmit_credits_resub_wallet_only(self):
        user = _User(1, deposit=Decimal(90), hold=Decimal(0))
        kyc = _KYC(5, status=KYCStatus.pending, payment=PaymentStatus.paid,
                   refunded=False, count=2)
        db = _DB(kyc, user)
        _approve(db, user, kyc, Decimal(10))
        cw = _company(db)
        assert cw.total_kyc_resubmission_collected == Decimal(10)
        assert cw.total_kyc_collected == Decimal(0)
        rel = _txns(db, WalletTransactionType.kyc_resubmission_fee_release)
        assert len(rel) == 1 and rel[0].amount == Decimal(10)
        assert _txns(db, WalletTransactionType.kyc_fee_release) == []

    def test_5_approve_first_submit_credits_first_wallet_only(self):
        user = _User(1, deposit=Decimal(90), hold=Decimal(0))
        kyc = _KYC(5, status=KYCStatus.pending, payment=PaymentStatus.paid,
                   refunded=False, count=1)
        db = _DB(kyc, user)
        _approve(db, user, kyc, Decimal(10))
        cw = _company(db)
        assert cw.total_kyc_collected == Decimal(10)
        assert (cw.total_kyc_resubmission_collected or Decimal(0)) == Decimal(0)
        assert len(_txns(db, WalletTransactionType.kyc_fee_release)) == 1
        assert _txns(db, WalletTransactionType.kyc_resubmission_fee_release) == []

    def test_6_multiple_cycles_reconcile_once_each(self):
        user = _User(1, deposit=Decimal(100), hold=Decimal(0))
        kyc = _KYC(5)
        db = _DB(kyc, user)
        # Cycle 1: resubmit -> reject
        _resubmit(db)
        _reject(db, user, kyc, user.kyc_hold)
        # Cycle 2: resubmit -> reject
        _resubmit(db)
        _reject(db, user, kyc, user.kyc_hold)
        # Cycle 3: resubmit -> approve
        _resubmit(db)
        _approve(db, user, kyc, user.kyc_hold)
        assert user.deposit_wallet == Decimal(90)
        assert user.kyc_hold == Decimal(0)
        assert kyc.submission_count == 4  # 1 first + 3 resubmissions
        assert len(_txns(db, WalletTransactionType.kyc_resubmission_fee_hold)) == 3
        refunds = _txns(db, WalletTransactionType.kyc_fee_refund,
                        WalletTransactionType.kyc_fee_reset_refund)
        assert len(refunds) == 2
        cw = _company(db)
        assert cw.total_kyc_resubmission_collected == Decimal(10)
        assert cw.total_kyc_collected == Decimal(0)

    def test_7_duplicate_retry_charges_nothing(self):
        user = _User(1, deposit=Decimal(90), hold=Decimal(10))
        kyc = _KYC(5, status=KYCStatus.pending, payment=PaymentStatus.paid,
                   refunded=False, count=2)
        kyc.admin_note = None
        db = _DB(kyc, user)
        resp = _resubmit(db)
        assert resp["fee_deducted"] == "0"
        assert user.deposit_wallet == Decimal(90)
        assert _txns(db, WalletTransactionType.kyc_resubmission_fee_hold) == []
        assert _txns(db, WalletTransactionType.kyc_fee_hold) == []

    def test_8_ledger_maps_resubmission_types(self):
        from app.api.v1.ledger import _WT_CATEGORY, TRANSACTION_STREAM_CATEGORIES

        assert _WT_CATEGORY["kyc_resubmission_fee_hold"][0] == "kyc_resubmission_fee"
        assert _WT_CATEGORY["kyc_resubmission_fee_release"][0] == "kyc_resubmission_fee"
        assert "kyc_resubmission_fee" in TRANSACTION_STREAM_CATEGORIES
        # First-KYC mapping untouched.
        assert _WT_CATEGORY["kyc_fee_hold"][0] == "kyc_fee"
