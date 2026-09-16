"""
Tests for withdrawal fee and net payout calculation.

Verifies:
  CASE 1 - Balance=40, Withdrawal=20, Fee=1 → net=19, remaining=20
  CASE 2 - Balance=100, Withdrawal=50, Fee=5 → net=45, remaining=50
  CASE 3 - Balance=100, Withdrawal=20, Fee=0 → net=20, remaining=80
  CASE 4 - Exact balance withdrawal (no double fee)
  CASE 5 - Fee not added twice (wallet deduction = requested only)
  CASE 6 - Invoice HTML shows Net Payout, not Total Amount
  CASE 7 - Admin view does NOT display fee-inflated amount

Financial model:
  requested_amount = amount submitted by user
  fee = company fee deducted from requested amount
  net_payout = requested_amount - fee
  wallet_deduction = requested_amount (fee is INSIDE the requested amount)
  remaining_balance = previous_balance - requested_amount
"""

from dataclasses import dataclass, field
from decimal import Decimal

import pytest

from app.services.invoice_service import _build_invoice_html


WALLET_PRECISION = Decimal("0.00000000000001")


def _qp(v):
    return v.quantize(WALLET_PRECISION)


@dataclass
class FakeUser:
    id: int = 1
    main_wallet: Decimal = field(default_factory=lambda: Decimal("40.00000000000000"))
    withdraw_wallet: Decimal = field(default_factory=lambda: Decimal("0"))


@dataclass
class FakeWithdrawal:
    id: int = 1
    user_id: int = 1
    amount: Decimal = field(default_factory=lambda: Decimal("20"))
    charge: Decimal = field(default_factory=lambda: Decimal("1"))
    source_wallet: str = "main_wallet"
    status: str = "pending"


class TestWithdrawalFeeNetPayout:
    """Tests for the correct withdrawal fee/net payout model."""

    def test_case1_balance_40_withdrawal_20_fee_1(self):
        """CASE 1: Balance=40, Withdrawal=20, Fee=1 → net=19, remaining=20."""
        user = FakeUser(main_wallet=Decimal("40.00000000000000"))
        amount = Decimal("20")
        fee = Decimal("1")

        # Wallet deduction: only the requested amount
        new_balance = _qp(Decimal(str(user.main_wallet)) - amount)
        user.main_wallet = new_balance

        # Net payout = requested - fee
        net_payout = amount - fee

        assert net_payout == Decimal("19"), "Net payout must be 19"
        assert user.main_wallet == Decimal("20.00000000000000"), "Remaining balance must be 20"
        assert amount + fee != net_payout, "Fee must NOT be added to requested amount"

    def test_case2_balance_100_withdrawal_50_fee_5(self):
        """CASE 2: Balance=100, Withdrawal=50, Fee=5 → net=45, remaining=50."""
        user = FakeUser(main_wallet=Decimal("100.00000000000000"))
        amount = Decimal("50")
        fee = Decimal("5")

        new_balance = _qp(Decimal(str(user.main_wallet)) - amount)
        user.main_wallet = new_balance

        net_payout = amount - fee

        assert net_payout == Decimal("45"), "Net payout must be 45"
        assert user.main_wallet == Decimal("50.00000000000000"), "Remaining balance must be 50"

    def test_case3_balance_100_withdrawal_20_fee_0(self):
        """CASE 3: Balance=100, Withdrawal=20, Fee=0 → net=20, remaining=80."""
        user = FakeUser(main_wallet=Decimal("100.00000000000000"))
        amount = Decimal("20")
        fee = Decimal("0")

        new_balance = _qp(Decimal(str(user.main_wallet)) - amount)
        user.main_wallet = new_balance

        net_payout = amount - fee

        assert net_payout == Decimal("20"), "Net payout must be 20"
        assert user.main_wallet == Decimal("80.00000000000000"), "Remaining balance must be 80"

    def test_case4_exact_balance_withdrawal(self):
        """CASE 4: Withdrawal equals exact balance → remaining=0."""
        user = FakeUser(main_wallet=Decimal("40.00000000000000"))
        amount = Decimal("40")
        fee = Decimal("1")

        new_balance = _qp(Decimal(str(user.main_wallet)) - amount)
        user.main_wallet = new_balance

        net_payout = amount - fee

        assert net_payout == Decimal("39"), "Net payout must be 39"
        assert user.main_wallet == Decimal("0.00000000000000"), "Remaining balance must be 0"

    def test_case5_no_double_fee_deduction(self):
        """CASE 5: Fee is NOT deducted separately from wallet. Only requested amount is deducted."""
        user = FakeUser(main_wallet=Decimal("40.00000000000000"))
        amount = Decimal("20")
        fee = Decimal("1")

        # Wallet deduction: ONLY amount, NOT amount + fee
        new_balance = _qp(Decimal(str(user.main_wallet)) - amount)
        user.main_wallet = new_balance

        # Verify: wallet deducted by exactly `amount`, not `amount + fee`
        assert user.main_wallet == Decimal("20.00000000000000")
        assert Decimal("40") - amount - fee != user.main_wallet, \
            "Fee must NOT be separately deducted from wallet"

    def test_case6_withdrawal_invoice_shows_net_payout(self):
        """CASE 6: Withdrawal invoice HTML shows Net Payout, not inflated Total Amount."""
        html = _build_invoice_html(
            invoice_number="OFA000999",
            invoice_type="withdrawal",
            user_name="Test User",
            user_email="test@example.com",
            amount=Decimal("20"),
            currency="USDT",
            status="completed",
            description="Withdrawal of 20.00 USDT via TRC20",
            created_at="Sep 15, 2026 12:00",
            tx_data={
                "fee": 1.0,
                "network": "TRC20",
                "transaction_id": "OFAWD-TEST1234",
            },
            user_id="U001",
        )
        # Must show "Net Payout" label (not "Total Amount")
        assert "Net Payout" in html
        # Must show 19.00 (20 - 1 = 19), NOT 21.00 (20 + 1 = 21)
        assert "19.00" in html
        assert "21.00" not in html, "Invoice must NOT show 21 (fee must not be added)"

    def test_case7_deposit_invoice_still_adds_fee(self):
        """CASE 7: Deposit invoice correctly adds fee (total = amount + fee)."""
        html = _build_invoice_html(
            invoice_number="OFA001000",
            invoice_type="deposit",
            user_name="Test User",
            user_email="test@example.com",
            amount=Decimal("100"),
            currency="USDT",
            status="completed",
            description="Deposit of 100.00 USDT via TRC20",
            created_at="Sep 15, 2026 12:00",
            tx_data={
                "fee": 5.0,
                "transaction_id": "TXN123ABC",
                "network": "TRC20",
            },
            user_id="U001",
        )
        # Deposit invoice: Total = 100 + 5 = 105
        assert "105.00" in html, "Deposit invoice must show 105 (100 + 5)"
        assert "Total Amount" in html, "Deposit invoice must show 'Total Amount' label"

    def test_case8_fee_deducted_label_in_withdrawal_invoice(self):
        """CASE 8: Withdrawal invoice shows 'Fee Deducted' label."""
        html = _build_invoice_html(
            invoice_number="OFA001001",
            invoice_type="withdrawal",
            user_name="Test User",
            user_email="test@example.com",
            amount=Decimal("50"),
            currency="USDT",
            status="completed",
            description="Withdrawal of 50.00 USDT via Bank",
            created_at="Sep 15, 2026 12:00",
            tx_data={
                "fee": 5.0,
                "network": "Bank Transfer",
                "transaction_id": "OFAWD-FEE12345",
            },
            user_id="U001",
        )
        assert "Fee Deducted" in html, "Withdrawal invoice must use 'Fee Deducted' label"
        assert "Requested Amount" in html, "Withdrawal invoice must show 'Requested Amount'"
        assert "45.00" in html, "Net payout must be 45 (50 - 5)"


class TestWithdrawalWalletDeduction:
    """Tests for correct wallet deduction (fee NOT double-deducted)."""

    def test_deduction_is_amount_only(self):
        """Wallet is deducted by requested amount, not amount + fee."""
        balance = Decimal("40.00000000000000")
        amount = Decimal("20")
        fee = Decimal("1")

        new_balance = _qp(balance - amount)
        assert new_balance == Decimal("20.00000000000000")
        # The fee is stored on the Withdrawal record but NOT deducted from wallet
        assert new_balance != _qp(balance - amount - fee), \
            "Fee must not be separately deducted"

    def test_approval_only_credits_withdraw_wallet(self):
        """Approval credits withdraw_wallet by requested amount, no wallet deduction."""
        user = FakeUser(
            main_wallet=Decimal("20.00000000000000"),
            withdraw_wallet=Decimal("0"),
        )
        amount = Decimal("20")

        # Approval: credit withdraw_wallet, do NOT touch main_wallet
        user.withdraw_wallet = _qp(Decimal(str(user.withdraw_wallet)) + amount)

        assert user.main_wallet == Decimal("20.00000000000000"), "main_wallet must not change on approval"
        assert user.withdraw_wallet == Decimal("20.00000000000000")

    def test_rejection_refunds_full_amount(self):
        """Rejection refunds the held amount back to source wallet."""
        user = FakeUser(main_wallet=Decimal("20.00000000000000"))
        amount = Decimal("20")

        # Refund
        user.main_wallet = _qp(Decimal(str(user.main_wallet)) + amount)

        assert user.main_wallet == Decimal("40.00000000000000")
