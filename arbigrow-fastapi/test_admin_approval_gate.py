"""Lifecycle tests for Admin Approval Required Before Login Access."""
import asyncio
import sys
sys.path.insert(0, ".")
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

# Setup to test auth helpers without DB
from app.api.v1.auth import get_pending_approval_message, DEFAULT_PENDING_APPROVAL_MESSAGE, PENDING_APPROVAL_MESSAGE_KEY, _is_pending_approval_user
from app.models.system_config import SystemConfig
from app.models.user import User

class FakeResult:
    def __init__(self, val): self.val = val
    def scalar_one_or_none(self): return self.val

class FakeDB:
    def __init__(self, config_val=None):
        self.config_val = config_val
    async def execute(self, stmt):
        if self.config_val is not None:
            row = MagicMock()
            row.value = self.config_val
            return FakeResult(row)
        return FakeResult(None)

def make_user(is_approved=False, is_admin=False, account_status="inactive", blocked_at=None):
    u = MagicMock(spec=User)
    u.is_approved = is_approved
    u.is_admin = is_admin
    u.account_status = account_status
    u.blocked_at = blocked_at
    return u

async def test_default_message():
    db = FakeDB(config_val=None)
    msg = await get_pending_approval_message(db)
    assert msg == DEFAULT_PENDING_APPROVAL_MESSAGE, f"default mismatch {msg}"
    print("PASS test_default_message")

async def test_custom_message():
    custom = "Your account is waiting for administrator approval."
    db = FakeDB(config_val=custom)
    msg = await get_pending_approval_message(db)
    assert msg == custom, f"custom mismatch {msg}"
    print("PASS test_custom_message")

async def test_pending_user_blocked():
    u = make_user(is_approved=False, is_admin=False, account_status="inactive")
    assert _is_pending_approval_user(u) == True
    print("PASS test_pending_user_blocked")

async def test_approved_user_allowed():
    u = make_user(is_approved=True, is_admin=False, account_status="active")
    assert _is_pending_approval_user(u) == False
    print("PASS test_approved_user_allowed")

async def test_admin_bypass():
    u = make_user(is_approved=False, is_admin=True, account_status="inactive")
    assert _is_pending_approval_user(u) == False
    print("PASS test_admin_bypass")

async def test_pending_payment_bypass():
    u = make_user(is_approved=False, is_admin=False, account_status="pending_payment")
    assert _is_pending_approval_user(u) == False
    print("PASS test_pending_payment_bypass")

async def test_blocked_check_in_deps():
    # Simulate get_current_user blocked check
    from app.api.v1.deps import get_current_user
    import inspect
    src = inspect.getsource(get_current_user)
    assert "is_approved" in src and "ADMIN_APPROVAL_PENDING" in src, "deps pending gate missing"
    assert "blocked_at" in src, "deps blocked check missing"
    print("PASS test_deps_enforces_both_checks")

async def test_login_contains_gate():
    import inspect
    from app.api.v1.auth import login
    src = inspect.getsource(login)
    assert "ADMIN_APPROVAL_PENDING" in src, "login missing pending gate"
    print("PASS test_login_contains_gate")

async def test_refresh_contains_gate():
    import inspect
    from app.api.v1.auth import refresh_session
    src = inspect.getsource(refresh_session)
    assert "ADMIN_APPROVAL_PENDING" in src, "refresh missing pending gate"
    print("PASS test_refresh_contains_gate")

async def test_signup_sets_is_approved_false():
    import inspect
    from app.api.v1.auth import signup
    src = inspect.getsource(signup)
    assert "is_approved=False" in src, "signup not setting is_approved False"
    print("PASS test_signup_sets_is_approved_false")

async def test_admin_endpoints_exist():
    from app.api.v1.admin import get_pending_approval_message_config, update_pending_approval_message_config, list_pending_approvals, approve_user
    assert get_pending_approval_message_config
    assert update_pending_approval_message_config
    assert list_pending_approvals
    assert approve_user
    print("PASS test_admin_endpoints_exist")

async def test_system_config_widened():
    from app.models.system_config import SystemConfig as SC
    length = SC.__table__.columns["value"].type.length
    assert length == 1000, f"SystemConfig value length {length} != 1000"
    print("PASS test_system_config_widened")

async def main():
    await test_default_message()
    await test_custom_message()
    await test_pending_user_blocked()
    await test_approved_user_allowed()
    await test_admin_bypass()
    await test_pending_payment_bypass()
    await test_blocked_check_in_deps()
    await test_login_contains_gate()
    await test_refresh_contains_gate()
    await test_signup_sets_is_approved_false()
    await test_admin_endpoints_exist()
    await test_system_config_widened()
    print("\nALL 11 ADMIN APPROVAL GATE TESTS PASSED")

if __name__ == "__main__":
    asyncio.run(main())
