"""Early-exit tests for Ad View completion (real endpoint logic).

Business rules under test:
  * completing before the required watch time is rejected (400) AND the
    failed attempt + early-exit error are durably persisted (committed),
    so the error budget actually sees ad violations;
  * an already-completed session is rejected without side effects;
  * no earning or wallet credit happens on early exit.

Runs the real ``complete_ad`` coroutine (unwrapped from the rate-limit
decorator) against an in-memory fake session — no database required.
"""
import asyncio
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest

import app.api.v1.ads as ads
from app.models.ad import Ad
from app.models.ad_view import AdView
from app.models.task_errors import TaskDisciplinaryConfig, TaskAttempt, TaskError
from app.models.user import User


def run(coro):
    return asyncio.run(coro)


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None

    def scalar(self):
        return self._rows[0] if self._rows else None

    def scalars(self):
        return self

    def all(self):
        return list(self._rows)

    def first(self):
        return self._rows[0] if self._rows else None


class FakeSession:
    def __init__(self, user, session, ad, configs):
        self.user = user
        self.session = session
        self.ad = ad
        self.configs = configs
        self.added = []
        self.attempts = []
        self.commits = 0

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "task_disciplinary_config" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            return FakeResult([self.configs[m.group(1)]] if m and m.group(1) in self.configs else [])
        if "FROM ad_views" in sql:
            return FakeResult([self.session])
        if "FROM ads" in sql:
            return FakeResult([self.ad])
        if "FROM users" in sql:
            return FakeResult([self.user])
        if "count(" in sql.lower():
            return FakeResult([len(self.attempts)])
        return FakeResult([])

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, TaskAttempt):
            self.attempts.append(obj)

    async def flush(self):
        return None

    async def commit(self):
        self.commits += 1

    async def refresh(self, obj):
        return None

    async def get(self, model, pk):
        if model is User:
            return self.user
        if model is TaskAttempt:
            return self.attempts[-1] if self.attempts else None
        return None


def _cfg(key, value):
    return TaskDisciplinaryConfig(key=key, value=value)


def _env(**over):
    user = User(
        id=1,
        email="adexit@oxford.com",
        username="ad_exit_tester",
        account_status="active",
        error_count=0,
        hold_count=0,
        suspension_count=0,
        ad_view_wallet=Decimal("0"),
    )
    session = AdView(
        id=777,
        user_id=1,
        ad_id=55,
        started_at=datetime.now(timezone.utc) - timedelta(seconds=over.get("watched", 5)),
        is_completed=over.get("completed", False),
        amount_earned=Decimal("0"),
    )
    ad = Ad(id=55, required_watch_seconds=30)
    configs = {
        "hold_threshold": _cfg("hold_threshold", "3"),
        "suspension_threshold": _cfg("suspension_threshold", "5"),
        "max_hold_per_cycle": _cfg("max_hold_per_cycle", "1"),
    }
    db = FakeSession(user, session, ad, configs)
    req = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"), headers={})
    return db, user, session, req


def _complete(db, req, vid=777):
    return run(ads.complete_ad.__wrapped__(req, vid, 1, db))


def test_early_exit_rejected_and_error_persisted():
    db, user, session, req = _env(watched=5)
    before_wallet = user.ad_view_wallet
    with pytest.raises(Exception) as exc:
        _complete(db, req)
    assert "at least 30 seconds" in str(exc.value.detail)
    assert db.commits >= 1, "failed attempt + error must be committed, not rolled back"
    assert user.error_count == 1
    assert user.ad_view_wallet == before_wallet
    assert session.is_completed is False
    assert float(session.amount_earned or 0) == 0
    assert any(isinstance(o, TaskError) and o.error_code == "ad_early_exit" for o in db.added)


def test_completed_session_rejected_without_side_effects():
    db, user, session, req = _env(watched=60, completed=True)
    session.is_completed = True
    with pytest.raises(Exception) as exc:
        _complete(db, req)
    assert "already completed" in str(exc.value.detail).lower()
    assert user.error_count == 0
    assert not [o for o in db.added if isinstance(o, TaskError)]
