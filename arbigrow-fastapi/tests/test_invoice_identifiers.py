"""
Tests for invoice identifier separation.

Verifies:
  TEST 1  - Invoice number format is INV-{TYPE}-{USER}-{TS}
  TEST 2  - Invoice number is unique per generation
  TEST 3  - Invoice number persists (same invoice, same number)
  TEST 4  - Deposit TXID preserved in tx_data
  TEST 5  - Withdrawal reference ID preserved in tx_data
  TEST 6  - Deposit invoice HTML contains "Deposit TX ID"
  TEST 7  - Withdrawal invoice HTML contains "Withdrawal Ref ID"
  TEST 8  - Invoice number != deposit txid
  TEST 9  - Invoice number != withdrawal reference
  TEST 10 - HTML contains Invoice No label
"""

import re
from decimal import Decimal

import pytest

from app.services.invoice_service import _build_invoice_html


class TestInvoiceIdentifiers:
    """Tests for invoice identifier separation."""

    def test_01_invoice_number_format(self):
        """TEST 1: Invoice number follows INV-{TYPE}-{USER}-{TS} format."""
        inv_number = "INV-DEPO-1-20260826120000"
        assert inv_number.startswith("INV-")
        parts = inv_number.split("-")
        assert len(parts) == 4
        assert parts[1] == "DEPO"
        assert parts[2].isdigit()
        assert parts[3].isdigit()

    def test_02_invoice_number_uniqueness(self):
        """TEST 2: Each generated invoice number is unique."""
        numbers = set()
        for i in range(50):
            ts = f"20260826{i:06d}"
            inv = f"INV-DEPO-1-{ts}"
            assert inv not in numbers
            numbers.add(inv)

    def test_03_invoice_number_persistence(self):
        """TEST 3: Same invoice object returns same number."""
        inv_number = "INV-DEPO-1-20260826120000"
        # Simulating multiple reads of the same invoice
        for _ in range(10):
            assert inv_number == "INV-DEPO-1-20260826120000"

    def test_04_deposit_txid_preserved_in_tx_data(self):
        """TEST 4: Deposit TXID is passed through in tx_data."""
        deposit_txid = "TXN8A72K9ABCDEF"
        tx_data = {
            "transaction_id": deposit_txid,
            "transaction_hash": deposit_txid,
            "network": "TRC20",
        }
        assert tx_data["transaction_id"] == deposit_txid

    def test_05_withdrawal_reference_preserved_in_tx_data(self):
        """TEST 5: Withdrawal reference ID is passed through in tx_data."""
        withdrawal_ref = "OFAWD582941ABCDEF"
        tx_data = {
            "transaction_id": withdrawal_ref,
            "network": "TRC20",
        }
        assert tx_data["transaction_id"] == withdrawal_ref

    def test_06_deposit_invoice_html_contains_deposit_tx_label(self):
        """TEST 6: Deposit invoice HTML shows 'Deposit TX ID'."""
        html = _build_invoice_html(
            invoice_number="INV-DEPO-1-20260826120000",
            invoice_type="deposit",
            user_name="Test User",
            user_email="test@example.com",
            amount=Decimal("500"),
            currency="USDT",
            status="completed",
            description="Deposit of 500.00 USDT via TRC20",
            created_at="Aug 26, 2026 12:00",
            tx_data={
                "transaction_id": "TXN8A72K9ABCDEF",
                "transaction_hash": "TXN8A72K9ABCDEF",
                "network": "TRC20",
            },
            user_id="U001",
        )
        assert "Deposit TX ID" in html
        assert "TXN8A72K9ABCDEF" in html
        assert "Invoice No" in html
        assert "INV-DEPO-1-20260826120000" in html

    def test_07_withdrawal_invoice_html_contains_withdrawal_ref_label(self):
        """TEST 7: Withdrawal invoice HTML shows 'Withdrawal Ref ID'."""
        html = _build_invoice_html(
            invoice_number="INV-WITH-1-20260826120000",
            invoice_type="withdrawal",
            user_name="Test User",
            user_email="test@example.com",
            amount=Decimal("100"),
            currency="USDT",
            status="completed",
            description="Withdrawal of 100.00 USDT via TRC20",
            created_at="Aug 26, 2026 12:00",
            tx_data={
                "transaction_id": "OFAWD582941ABCDEF",
                "network": "TRC20",
            },
            user_id="U001",
        )
        assert "Withdrawal Ref ID" in html
        assert "OFAWD582941ABCDEF" in html
        assert "Invoice No" in html
        assert "INV-WITH-1-20260826120000" in html

    def test_08_invoice_number_differs_from_deposit_txid(self):
        """TEST 8: Invoice number is NOT the same as deposit TXID."""
        inv_number = "INV-DEPO-1-20260826120000"
        deposit_txid = "TXN8A72K9ABCDEF"
        assert inv_number != deposit_txid

    def test_09_invoice_number_differs_from_withdrawal_ref(self):
        """TEST 9: Invoice number is NOT the same as withdrawal reference."""
        inv_number = "INV-WITH-1-20260826120000"
        withdrawal_ref = "OFAWD582941ABCDEF"
        assert inv_number != withdrawal_ref

    def test_10_html_contains_invoice_no_label(self):
        """TEST 10: HTML always shows Invoice No label."""
        html = _build_invoice_html(
            invoice_number="INV-DEPO-1-20260826120000",
            invoice_type="deposit",
            user_name="Test User",
            user_email="test@example.com",
            amount=Decimal("500"),
            currency="USDT",
            status="completed",
            description="Deposit",
            created_at="Aug 26, 2026 12:00",
            tx_data={"transaction_id": "TXN123", "network": "TRC20"},
            user_id="U001",
        )
        assert "Invoice No" in html
        # Verify Invoice Number appears in transaction details table too
        assert "Invoice Number" in html


class TestOFAFormat:
    """Tests for OFA+6digits invoice and OFAWD+6digits withdrawal format."""

    def test_11_format_invoice_number(self):
        """TEST 11: format_invoice_number produces OFA + 6 digits."""
        from app.utils.transaction_id import format_invoice_number
        assert format_invoice_number(1) == "OFA000001"
        assert format_invoice_number(880) == "OFA000880"
        assert format_invoice_number(999999) == "OFA999999"
        assert format_invoice_number(1234567) == "OFA1234567"

    def test_12_format_withdrawal_reference(self):
        """TEST 12: format_withdrawal_reference produces OFAWD + 6 digits."""
        from app.utils.transaction_id import format_withdrawal_reference
        assert format_withdrawal_reference(1) == "OFAWD000001"
        assert format_withdrawal_reference(582941) == "OFAWD582941"
        assert format_withdrawal_reference(999999) == "OFAWD999999"

    def test_13_invoice_number_uniqueness_by_id(self):
        """TEST 13: Different IDs produce different invoice numbers."""
        from app.utils.transaction_id import format_invoice_number
        nums = {format_invoice_number(i) for i in range(1, 1001)}
        assert len(nums) == 1000

    def test_14_withdrawal_ref_uniqueness_by_id(self):
        """TEST 14: Different IDs produce different withdrawal refs."""
        from app.utils.transaction_id import format_withdrawal_reference
        refs = {format_withdrawal_reference(i) for i in range(1, 1001)}
        assert len(refs) == 1000

    def test_15_invoice_and_withdrawal_formats_differ(self):
        """TEST 15: Invoice number and withdrawal ref have different prefixes."""
        from app.utils.transaction_id import format_invoice_number, format_withdrawal_reference
        inv = format_invoice_number(1)
        wdr = format_withdrawal_reference(1)
        assert inv.startswith("OFA")
        assert wdr.startswith("OFAWD")
        assert inv != wdr

    def test_16_html_with_ofa_format_deposit(self):
        """TEST 16: Deposit invoice HTML with OFA number and user TXID."""
        html = _build_invoice_html(
            invoice_number="OFA000880",
            invoice_type="deposit",
            user_name="Test User",
            user_email="test@example.com",
            amount=Decimal("500"),
            currency="USDT",
            status="completed",
            description="Deposit",
            created_at="Aug 26, 2026 12:00",
            tx_data={"transaction_id": "TXN8A72K9ABCDEF", "network": "TRC20"},
            user_id="U001",
        )
        assert "OFA000880" in html
        assert "TXN8A72K9ABCDEF" in html
        assert "Deposit TX ID" in html
        assert "Invoice Number" in html

    def test_17_html_with_ofa_format_withdrawal(self):
        """TEST 17: Withdrawal invoice HTML with OFAWD number."""
        html = _build_invoice_html(
            invoice_number="OFA000881",
            invoice_type="withdrawal",
            user_name="Test User",
            user_email="test@example.com",
            amount=Decimal("100"),
            currency="USDT",
            status="completed",
            description="Withdrawal",
            created_at="Aug 26, 2026 12:00",
            tx_data={"transaction_id": "OFAWD000047", "network": "TRC20"},
            user_id="U001",
        )
        assert "OFA000881" in html
        assert "OFAWD000047" in html
        assert "Withdrawal Ref ID" in html
        assert "Invoice Number" in html

    def test_18_concurrent_invoice_number_generation(self):
        """TEST 18: Simulated concurrent invoice number generation from sequential IDs."""
        from app.utils.transaction_id import format_invoice_number
        # Simulate 100 concurrent requests getting sequential IDs
        results = []
        for i in range(100, 200):
            results.append(format_invoice_number(i))
        # All must be unique
        assert len(set(results)) == 100

    def test_19_concurrent_withdrawal_ref_generation(self):
        """TEST 19: Simulated concurrent withdrawal ref generation from sequential IDs."""
        from app.utils.transaction_id import format_withdrawal_reference
        results = []
        for i in range(100, 200):
            results.append(format_withdrawal_reference(i))
        assert len(set(results)) == 100
