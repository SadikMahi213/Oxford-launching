"""Unit tests for the suspension-only fund-movement gate.

check_no_suspension() blocks SUSPENDED and PERMANENTLY_CLOSED accounts
from fund movements (wallet transfers, checkout, vendor withdrawals)
while letting ON_HOLD, ACTIVE, PENDING_PAYMENT and INACTIVE accounts
through — holds keep only task/earning restrictions.
"""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.deps import check_no_suspension


def _user(status):
    return SimpleNamespace(account_status=status)


def test_suspended_is_blocked():
    with pytest.raises(HTTPException) as exc:
        check_no_suspension(_user("suspended"))
    assert exc.value.status_code == 403
    assert "suspend" in exc.value.detail.lower()


def test_permanently_closed_is_blocked():
    with pytest.raises(HTTPException) as exc:
        check_no_suspension(_user("permanently_closed"))
    assert exc.value.status_code == 403


def test_on_hold_is_allowed():
    # Holds keep task/earning restrictions only — fund movements stay open.
    assert check_no_suspension(_user("on_hold")) is None


def test_active_is_allowed():
    assert check_no_suspension(_user("active")) is None


def test_pending_payment_and_inactive_untouched():
    # Other flows (payment completion, KYC activation) are out of scope.
    assert check_no_suspension(_user("pending_payment")) is None
    assert check_no_suspension(_user("inactive")) is None


def test_case_insensitive_and_missing_status():
    try:
        check_no_suspension(_user("SUSPENDED"))
        blocked = False
    except HTTPException:
        blocked = True
    assert blocked is True
    assert check_no_suspension(_user(None)) is None
    assert check_no_suspension(_user("")) is None
