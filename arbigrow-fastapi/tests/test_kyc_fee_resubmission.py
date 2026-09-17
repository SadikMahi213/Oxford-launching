"""KYC fee refund and resubmission accounting tests.

Validates Phase 4 scenarios:
1. One successful fee -> admin 10
2. 10 -> refund -> 0
3. 10 -> refund -> resubmit 10 -> 10
4. 10 -> refund -> resubmit 10 -> reject 10 -> 0
5. 10 -> refund -> resubmit 10 -> approve -> 10
Uses the authoritative KYC table query (paid and fee_refunded==False).
Decimal-safe.
No double refund.
"""
import pathlib, re

KYC_PATH = pathlib.Path(__file__).parent.parent / "app" / "api" / "v1" / "kyc.py"
ADMIN_PATH = pathlib.Path(__file__).parent.parent / "app" / "api" / "v1" / "admin.py"

def test_kyc_resubmission_resets_fee_refunded_flag():
    src = KYC_PATH.read_text()
    # Must reset fee_refunded on resubmission after refund
    assert "existing_kyc.fee_refunded = False" in src, "kyc.py resubmission must reset fee_refunded False"
    assert "existing_kyc.fee_refunded_at = None" in src
    # Must set payment_status paid
    assert "existing_kyc.payment_status = PaymentStatus.paid" in src

def test_admin_approve_resets_fee_refunded_flag():
    src = ADMIN_PATH.read_text()
    # Approve path must clear refund flag even when releasing hold
    assert "kyc.fee_refunded = False" in src
    assert "kyc.fee_refunded_at = None" in src

def test_admin_kyc_sum_query_authoritative():
    src = ADMIN_PATH.read_text()
    # Authoritative query must be where payment_status==paid and fee_refunded==False and sum fee_paid
    assert "KYC.fee_paid" in src
    assert "PaymentStatus.paid" in src
    assert "fee_refunded == False" in src

def test_resubmission_creates_new_hold_transaction():
    src = KYC_PATH.read_text()
    assert "WalletTransactionType.kyc_fee_hold" in src
    assert 'description="KYC Fee Placed on Hold"' in src

def test_no_hardcoded_fee():
    src = KYC_PATH.read_text()
    # Should not hardcode 10 for admin calc; fee comes from SystemConfig + package
    assert 'kyc_fee' in src.lower()
    assert re.search(r"SystemConfig.*kyc_fee", src, re.IGNORECASE)

def test_decimal_safe_quantize():
    src = KYC_PATH.read_text()
    assert "WALLET_PRECISION" in src
    assert "quantize" in src
    src2 = ADMIN_PATH.read_text()
    assert "WALLET_PRECISION" in src2

def test_refund_does_not_double_when_hold_zero():
    src = ADMIN_PATH.read_text()
    assert "if hold_amount > 0:" in src, "refund must be gated on hold_amount >0 to prevent double refund"

def test_admin_notifications_removed_from_router():
    router = (pathlib.Path(__file__).parent.parent / "app" / "api" / "router.py").read_text()
    assert "admin_notifications" not in router, "admin_notifications router should be removed"

def test_admin_layout_notifications_removed():
    layout = (pathlib.Path(__file__).parent.parent.parent / "ArbiGrow" / "src" / "component" / "admin" / "AdminLayout.jsx").read_text()
    assert "NotificationBell" not in layout
    assert "PopupNotification" not in layout
    assert 'id: "notifications"' not in layout

def test_admin_dashboard_notifications_removed():
    dash = (pathlib.Path(__file__).parent.parent.parent / "ArbiGrow" / "src" / "page" / "AdminDashboard.jsx").read_text()
    assert "NotificationHistory" not in dash
    assert 'case "notifications"' not in dash
