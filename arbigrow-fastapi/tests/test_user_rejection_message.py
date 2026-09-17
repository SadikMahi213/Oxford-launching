import pathlib

AUTH = pathlib.Path(__file__).parent.parent / "app" / "api" / "v1" / "auth.py"
ADMIN = pathlib.Path(__file__).parent.parent / "app" / "api" / "v1" / "admin.py"
DEPS = pathlib.Path(__file__).parent.parent / "app" / "api" / "v1" / "deps.py"
USER_MODEL = pathlib.Path(__file__).parent.parent / "app" / "models" / "user.py"
MIGRATION = pathlib.Path(__file__).parent.parent / "alembic" / "versions" / "t005_add_rejection_message_to_users.py"

def test_rejection_message_constants():
    src = AUTH.read_text()
    assert "REJECTION_MESSAGE_KEY" in src
    assert "DEFAULT_REJECTION_MESSAGE" in src or "DEFAULT_USER_REJECTION_MESSAGE" in src
    assert "Your account has been rejected" in src

def test_rejected_user_gate_exists():
    src = AUTH.read_text()
    assert "_is_rejected_user" in src
    assert "USER_REJECTED" in src
    assert "get_user_rejection_message" in src

def test_login_checks_rejected_before_pending():
    src = AUTH.read_text()
    # Find login function and ensure rejected check appears before pending
    login_section = src[src.index("def login"):] if "def login" in src else src
    # Actually check ordering in file
    rej_idx = src.index("_is_rejected_user")
    pend_idx = src.index("_is_pending_approval_user")
    # Ensure both exist and rejected handling in login is before pending
    assert "if _is_rejected_user" in src
    assert src.index("if _is_rejected_user(user):") < src.index("if _is_pending_approval_user(user):")

def test_deps_checks_rejected():
    src = DEPS.read_text()
    assert "admin_kyc_status" in src and "rejected" in src.lower()
    assert "USER_REJECTED" in src
    assert "rejection_message" in src

def test_user_model_has_rejection_message():
    src = USER_MODEL.read_text()
    assert "rejection_message" in src

def test_migration_exists():
    assert MIGRATION.exists()
    txt = MIGRATION.read_text()
    assert "rejection_message" in txt

def test_admin_rejection_endpoints():
    src = ADMIN.read_text()
    assert '"/rejection-message"' in src
    assert "USER_REJECTION_MESSAGE_KEY" in src
    assert "DEFAULT_USER_REJECTION_MESSAGE" in src

def test_admin_kyc_rejection_snapshot():
    src = ADMIN.read_text()
    # Snapshot logic
    assert "user.rejection_message = snap" in src
    assert "kyc.admin_note = snap" in src
    # Clear on approve
    assert "user.rejection_message = None" in src

def test_user_self_delete_endpoint():
    from pathlib import Path
    user_py = Path(__file__).parent.parent / "app" / "api" / "v1" / "user.py"
    src = user_py.read_text()
    assert '"/account"' in src
    assert "delete_own_account" in src
    assert "blacklist_access_token" in src
    assert "Your account has been deleted successfully" in src

def test_frontend_login_handles_rejected():
    login = (pathlib.Path(__file__).parent.parent.parent / "ArbiGrow" / "src" / "page" / "Login.jsx").read_text()
    assert "USER_REJECTED" in login
    assert "isRejected" in login or "USER_REJECTED" in login

def test_frontend_admin_rejection_ui():
    panel = (pathlib.Path(__file__).parent.parent.parent / "ArbiGrow" / "src" / "component" / "admin" / "SystemConfigPanel.jsx").read_text()
    assert "Rejection" in panel or "rejection" in panel.lower()
    assert "getRejectionMessage" in panel or "rejection" in panel.lower()

def test_frontend_delete_ui():
    profile = (pathlib.Path(__file__).parent.parent.parent / "ArbiGrow" / "src" / "component" / "user" / "ProfilePage.jsx").read_text()
    assert "Delete Account" in profile or "deleteOwnAccount" in profile
    assert "clearSession" in profile or "Your account has been deleted" in profile
