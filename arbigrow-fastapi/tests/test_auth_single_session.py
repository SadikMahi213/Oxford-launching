"""Auth uses a single DB session per request.

Regression test for the QueuePool-exhaustion fix: the token-blacklist
lookup inside get_current_user_id must run on the already-resolved request
session, never by opening a second session (AsyncSessionLocal).
"""
import inspect
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.security import create_access_token, get_current_user_id


class FakeResult:
    def __init__(self, obj=None):
        self.obj = obj

    def scalar_one_or_none(self):
        return self.obj


class FakeSession:
    def __init__(self, blacklisted_jtis=()):
        self.blacklisted = set(blacklisted_jtis)
        self.queries = []

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        self.queries.append(sql)
        import re

        m = re.search(r"jti = '([^']+)'", sql)
        hit = m and m.group(1) in self.blacklisted
        return FakeResult(object() if hit else None)


def _request(token):
    return SimpleNamespace(headers={"Authorization": f"Bearer {token}"})


def test_clean_token_uses_request_session():
    token = create_access_token({"sub": "7"})
    sess = FakeSession()
    uid = __import__("asyncio").run(
        get_current_user_id(_request(token), token, sess))
    assert uid == 7
    assert len(sess.queries) == 1
    assert "token_blacklist" in sess.queries[0]


def test_revoked_token_rejected():
    from jose import jwt
    from app.core.config import settings

    token = create_access_token({"sub": "7"})
    jti = jwt.decode(token, settings.SECRET_KEY,
                     algorithms=[settings.ALGORITHM])["jti"]
    sess = FakeSession(blacklisted_jtis={jti})
    with pytest.raises(HTTPException) as exc:
        __import__("asyncio").run(
            get_current_user_id(_request(token), token, sess))
    assert exc.value.status_code == 401
    assert exc.value.detail == "Token has been revoked"


def test_invalid_token_rejected_without_db():
    sess = FakeSession()
    with pytest.raises(HTTPException) as exc:
        __import__("asyncio").run(
            get_current_user_id(_request("not-a-token"), "not-a-token", sess))
    assert exc.value.status_code == 401
    assert sess.queries == []


def test_no_second_session_factory_used():
    src = inspect.getsource(get_current_user_id)
    assert "AsyncSessionLocal" not in src
    assert "db" in inspect.signature(get_current_user_id).parameters
