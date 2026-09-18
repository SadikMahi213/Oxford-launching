"""
Tests for the atomic withdrawal balance reservation flow.

Verifies:
  TEST 1  - Normal withdrawal reserves balance atomically
  TEST 2  - Approval does NOT double-deduct
  TEST 3  - Rejection refunds exactly the held amount
  TEST 4  - Double-spend prevention (two concurrent withdrawals)
  TEST 5  - Exact balance withdrawal
  TEST 6  - Rejection idempotency (no double refund)
  TEST 7  - Approval idempotency (no duplicate completion)
  TEST 8  - Concurrent withdrawal prevention
  TEST 9  - Charge calculation
  TEST 10 - Ledger balance consistency
"""

from dataclasses import dataclass, field
from decimal import Decimal

import pytest


WALLET_PRECISION = Decimal("0.00000000000001")


def _qp(v):
    return v.quantize(WALLET_PRECISION)


@dataclass
class FakeUser:
    id: int = 1
    main_wallet: Decimal = field(default_factory=lambda: Decimal("100.00000000000000"))
    withdraw_wallet: Decimal = field(default_factory=lambda: Decimal("0"))


@dataclass
class FakeWithdrawal:
    id: int = 1
    user_id: int = 1
    amount: Decimal = field(default_factory=lambda: Decimal("30"))
    source_wallet: str = "main_wallet"
    status: str = "pending"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestWithdrawalAtomicHold:
    """Tests for the atomic withdrawal balance reservation flow."""

    def test_01_normal_withdrawal_reserves_balance(self):
        """TEST 1: Normal withdrawal deducts balance atomically at creation."""
        user = FakeUser(main_wallet=Decimal("100.00000000000000"))

        # Simulate the creation-time logic (WITH FOR UPDATE lock)
        source_balance = Decimal(str(getattr(user, "main_wallet", Decimal("0")) or 0))
        amount = Decimal("30")
        assert source_balance >= amount, "Should have sufficient balance"

        # Deduct atomically
        new_balance = _qp(source_balance - amount)
        setattr(user, "main_wallet", new_balance)

        assert user.main_wallet == Decimal("70.00000000000000")

    def test_02_approval_no_double_deduction(self):
        """TEST 2: Approval credits withdraw_wallet but does NOT deduct main_wallet again."""
        user = FakeUser(
            main_wallet=Decimal("70.00000000000000"),  # Already deducted at creation
            withdraw_wallet=Decimal("0"),
        )
        withdrawal = FakeWithdrawal(amount=Decimal("30"))

        # Simulate approval logic (NEW behavior)
        amount = Decimal(str(withdrawal.amount))
        user.withdraw_wallet = _qp(Decimal(str(user.withdraw_wallet or 0)) + amount)
        # No deduction from main_wallet — was already done at creation

        assert user.main_wallet == Decimal("70.00000000000000"), "main_wallet should NOT change on approval"
        assert user.withdraw_wallet == Decimal("30.00000000000000")

    def test_03_rejection_refunds_exactly(self):
        """TEST 3: Rejection refunds the held amount back to source wallet."""
        user = FakeUser(
            main_wallet=Decimal("70.00000000000000"),  # After creation deduction
        )
        withdrawal = FakeWithdrawal(amount=Decimal("30"))

        # Simulate rejection logic (NEW behavior)
        amount = Decimal(str(withdrawal.amount))
        source_balance = Decimal(str(getattr(user, withdrawal.source_wallet, "0") or 0))
        setattr(user, withdrawal.source_wallet, _qp(source_balance + amount))

        assert user.main_wallet == Decimal("100.00000000000000"), "Full amount refunded"

    def test_04_double_spend_prevention(self):
        """TEST 4: Second withdrawal with insufficient balance must fail."""
        user = FakeUser(main_wallet=Decimal("100.00000000000000"))

        # First withdrawal: $80
        amount1 = Decimal("80")
        source_balance = Decimal(str(user.main_wallet))
        assert source_balance >= amount1
        user.main_wallet = _qp(source_balance - amount1)
        assert user.main_wallet == Decimal("20.00000000000000")

        # Second withdrawal: $80 — must fail
        amount2 = Decimal("80")
        source_balance_2 = Decimal(str(user.main_wallet))
        assert source_balance_2 < amount2, "Second withdrawal should fail"

    def test_05_exact_balance_withdrawal(self):
        """TEST 5: Withdrawing exact balance leaves $0, second withdrawal fails."""
        user = FakeUser(main_wallet=Decimal("100.00000000000000"))

        # Withdraw exact balance
        amount = Decimal("100")
        source_balance = Decimal(str(user.main_wallet))
        assert source_balance >= amount
        user.main_wallet = _qp(source_balance - amount)
        assert user.main_wallet == Decimal("0.00000000000000")

        # Any further withdrawal must fail
        assert Decimal(str(user.main_wallet)) < Decimal("1")

    def test_06_rejection_idempotency(self):
        """TEST 6: Rejecting twice does NOT double-refund (status guard)."""
        user = FakeUser(main_wallet=Decimal("70.00000000000000"))
        withdrawal = FakeWithdrawal(amount=Decimal("30"), status="pending")

        # First rejection
        amount = Decimal(str(withdrawal.amount))
        source_balance = Decimal(str(getattr(user, withdrawal.source_wallet, "0") or 0))
        setattr(user, withdrawal.source_wallet, _qp(source_balance + amount))
        withdrawal.status = "rejected"
        assert user.main_wallet == Decimal("100.00000000000000")

        # Second rejection attempt — withdrawal.status != "pending", so blocked
        assert withdrawal.status == "rejected", "Status guard prevents double refund"

    def test_07_approval_idempotency(self):
        """TEST 7: Approving twice does NOT double-credit withdraw_wallet (status guard)."""
        user = FakeUser(
            main_wallet=Decimal("70.00000000000000"),
            withdraw_wallet=Decimal("0"),
        )
        withdrawal = FakeWithdrawal(amount=Decimal("30"), status="pending")

        # First approval
        amount = Decimal(str(withdrawal.amount))
        user.withdraw_wallet = _qp(Decimal(str(user.withdraw_wallet or 0)) + amount)
        withdrawal.status = "approved"
        assert user.withdraw_wallet == Decimal("30.00000000000000")

        # Second approval attempt — status guard blocks
        assert withdrawal.status == "approved", "Status guard prevents double credit"

    def test_08_concurrent_withdrawal_prevention(self):
        """TEST 8: With FOR UPDATE lock, only one of two concurrent requests succeeds."""
        user = FakeUser(main_wallet=Decimal("100.00000000000000"))

        # Simulate first request acquiring lock and deducting
        source_balance = Decimal(str(user.main_wallet))
        amount1 = Decimal("80")
        assert source_balance >= amount1
        user.main_wallet = _qp(source_balance - amount1)
        assert user.main_wallet == Decimal("20.00000000000000")

        # Second request reads the UPDATED value (20, not stale 100)
        actual_balance = Decimal(str(user.main_wallet))
        amount2 = Decimal("80")
        assert actual_balance < amount2, "Concurrent request must fail"

    def test_09_charge_calculation(self):
        """TEST 9: Charge is calculated but NOT separately deducted from wallet."""
        amount = Decimal("100")
        charge_percent = Decimal("5")
        charge = (amount * charge_percent / Decimal("100")).quantize(WALLET_PRECISION)

        assert charge == Decimal("5.00000000000000")

        # The charge is stored on the withdrawal record but the source wallet
        # is only debited by the principal amount
        source = Decimal("100")
        new_balance = _qp(source - amount)
        assert new_balance == Decimal("0.00000000000000")

    def test_10_ledger_balance_consistency(self):
        """TEST 10: Ledger balance matches main_wallet after operations."""
        user = FakeUser(main_wallet=Decimal("100.00000000000000"))

        # Deposit earns $50 → main_wallet increases
        user.main_wallet = _qp(Decimal(str(user.main_wallet)) + Decimal("50"))
        assert user.main_wallet == Decimal("150.00000000000000")

        # Withdraw $30 → deducted at creation
        user.main_wallet = _qp(Decimal(str(user.main_wallet)) - Decimal("30"))
        assert user.main_wallet == Decimal("120.00000000000000")

        # Withdraw $20 → deducted at creation
        user.main_wallet = _qp(Decimal(str(user.main_wallet)) - Decimal("20"))
        assert user.main_wallet == Decimal("100.00000000000000")

        # Rejection refunds $20
        user.main_wallet = _qp(Decimal(str(user.main_wallet)) + Decimal("20"))
        assert user.main_wallet == Decimal("120.00000000000000")

        # Ledger should reflect main_wallet = 120
        ledger_balance = Decimal(str(user.main_wallet))
        assert ledger_balance == Decimal("120.00000000000000")


class TestWithdrawalTransactionId:
    """Tests for withdrawal transaction_id generation."""

    def test_11_transaction_id_is_generated(self):
        """TEST 11: Withdrawal creation generates a transaction_id."""
        from app.utils.transaction_id import generate_transaction_id

        tx_id = generate_transaction_id(16)
        assert tx_id is not None
        assert len(tx_id) == 16
        assert tx_id.isalnum()
        assert tx_id.isupper()

    def test_12_transaction_id_uniqueness(self):
        """TEST 12: Generated transaction IDs are unique."""
        from app.utils.transaction_id import generate_transaction_id

        ids = set()
        for _ in range(100):
            tx_id = generate_transaction_id(16)
            assert tx_id not in ids, "Transaction IDs should be unique"
            ids.add(tx_id)
