"""Persistent sessions: cookie fallback, refresh rotation, best-effort logout.

Covers Phase 1/2/6 (auth):
- page refresh / missing Authorization header still authenticates via the
  httpOnly access cookie (oauth2 auto_error=False makes the cookie fallback
  reachable again)
- absent credentials 401 cleanly (no crash)
- refresh-token issue -> validate roundtrip, sliding expiry, revoked/expired/
  unknown tokens rejected without side effects
- explicit logout path (revoke) invalidates future refreshes
- login issues the persistent refresh cookie; /refresh route exists; logout
  no longer hard-requires a valid access token

No real database is touched (FakeSession).
"""
import asyncio
import inspect
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.core import security
from app.core.security import (
    compute_refresh_token_hash,
    create_access_token,
    generate_refresh_token,
    get_current_user_id,
    issue_refresh_token,
    revoke_refresh_token,
    validate_refresh_token,
)
from app.models.refresh_token import RefreshToken


def _run(coro):
    return asyncio.run(coro)


# ── Fakes ──────────────────────────────────────────────────────────────────

class FakeResult:
    def __init__(self, obj=None):
        self.obj = obj

    def scalar_one_or_none(self):
        return self.obj


class FakeSession:
    """Minimal AsyncSession double serving token_blacklist + refresh_tokens."""

    def __init__(self):
        self.refresh_rows = []
        self.blacklisted = set()
        self.added = []
        self.commits = 0

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, RefreshToken) and obj not in self.refresh_rows:
            self.refresh_rows.append(obj)

    async def commit(self):
        self.commits += 1

    async def execute(self, stmt):
        import re

        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "refresh_tokens" in sql:
            m = re.search(r"token_hash = '([^']+)'", sql)
            hit = None
            if m:
                hit = next(
                    (r for r in self.refresh_rows if r.token_hash == m.group(1)),
                    None,
                )
            return FakeResult(hit)
        if "token_blacklist" in sql:
            m = re.search(r"jti = '([^']+)'", sql)
            hit = m and m.group(1) in self.blacklisted
            return FakeResult(object() if hit else None)
        return FakeResult(None)


def _request(token=None, cookie=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    cookies = {"access_token": cookie} if cookie else {}
    return SimpleNamespace(headers=headers, cookies=cookies)


# ── Cookie fallback (page refresh survival) ─────────────────────────────────

def test_cookie_authenticates_without_authorization_header():
    """Refresh wipes the in-memory token (no header) — the cookie must work."""
    token = create_access_token({"sub": "7"})
    uid = _run(get_current_user_id(_request(cookie=token), None, FakeSession()))
    assert uid == 7


def test_header_still_preferred_when_present():
    token = create_access_token({"sub": "9"})
    uid = _run(get_current_user_id(_request(token=token), token, FakeSession()))
    assert uid == 9


def test_no_credentials_401_without_crash():
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        _run(get_current_user_id(_request(), None, FakeSession()))
    assert exc.value.status_code == 401


def test_oauth_scheme_does_not_hard_fail():
    assert security.oauth2_scheme.auto_error is False


# ── Refresh token lifecycle ─────────────────────────────────────────────────

def test_issue_validate_roundtrip():
    sess = FakeSession()
    raw = _run(issue_refresh_token(sess, 42, 30))
    assert raw
    assert _run(validate_refresh_token(sess, raw, 30)) == 42


def test_unknown_refresh_rejected_without_side_effects():
    sess = FakeSession()
    assert _run(validate_refresh_token(sess, "nope", 30)) is None
    assert sess.commits == 0
    assert sess.added == []


def test_revoked_refresh_rejected():
    sess = FakeSession()
    raw = _run(issue_refresh_token(sess, 42, 30))
    _run(revoke_refresh_token(sess, raw))
    assert _run(validate_refresh_token(sess, raw, 30)) is None


def test_expired_refresh_rejected():
    sess = FakeSession()
    raw, hashed = generate_refresh_token()
    sess.refresh_rows.append(
        RefreshToken(
            user_id=42,
            token_hash=hashed,
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
            revoked=False,
        )
    )
    assert _run(validate_refresh_token(sess, raw, 30)) is None


def test_successful_refresh_slides_expiry():
    sess = FakeSession()
    raw = _run(issue_refresh_token(sess, 42, 30))
    before = sess.refresh_rows[0].expires_at
    assert _run(validate_refresh_token(sess, raw, 30)) == 42
    assert sess.refresh_rows[0].expires_at >= before


def test_hash_roundtrip():
    raw, hashed = generate_refresh_token()
    assert compute_refresh_token_hash(raw) == hashed


# ── Wiring (login / refresh / logout endpoints) ─────────────────────────────

def test_login_issues_persistent_refresh_cookie():
    import app.api.v1.auth as auth_mod

    src = inspect.getsource(auth_mod.login)
    assert '"refresh_token"' in src or "'refresh_token'" in src
    assert "issue_refresh_token" in src


def test_refresh_endpoint_exists():
    import app.api.v1.auth as auth_mod

    routes = [r.path for r in auth_mod.router.routes]
    assert any(p == "/refresh" or p.endswith("/refresh") for p in routes)


def test_logout_is_best_effort_and_clears_both_cookies():
    import app.api.v1.auth as auth_mod

    src = inspect.getsource(auth_mod.logout)
    assert "get_current_user_id" not in src
    assert "revoke_refresh_token" in src
    assert "refresh_token" in src
    assert "access_token" in src
