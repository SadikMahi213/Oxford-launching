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
from datetime import date
from app.models.ad import Ad
from app.models.ad_view import AdView
from app.models.investments import Investment
from app.models.package import Package, TaskType
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


class FakeUpdateResult:
    def __init__(self, rowcount):
        self.rowcount = rowcount


class FakeSession:
    def __init__(self, user, session, ad, configs):
        self.user = user
        self.session = session
        self.sessions = {session.id: session} if session is not None else {}
        self.ad = ad
        self.configs = configs
        self.added = []
        self.attempts = []
        self.commits = 0
        self.seen_sql = []
        self.consumed_ids = []
        self.ads_list = []
        self.open_sessions = []
        self.investment = None
        self.package = None

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        self.seen_sql.append(sql)
        if re.search(r"SELECT\s+ad_views\.ad_id\s+FROM", sql):
            return FakeResult(list(self.consumed_ids))
        if sql.lstrip().upper().startswith("UPDATE") and "ad_views" in sql:
            m = re.search(r"ad_views\.id = (\d+)", sql)
            s = self.sessions.get(int(m.group(1))) if m else None
            if s is not None and s.user_id == 1 and not s.is_completed and s.completed_at is None:
                s.completed_at = datetime.now(timezone.utc)
                return FakeUpdateResult(1)
            return FakeUpdateResult(0)
        if "task_disciplinary_config" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            return FakeResult([self.configs[m.group(1)]] if m and m.group(1) in self.configs else [])
        if "FROM ad_views" in sql:
            m = re.search(r"ad_views\.id = (\d+)", sql)
            if m:
                s = self.sessions.get(int(m.group(1)))
                return FakeResult([s] if s else [])
            return FakeResult(list(self.open_sessions))
        if "FROM ads" in sql:
            return FakeResult(list(self.ads_list) or ([self.ad] if self.ad else []))
        if "FROM investments" in sql:
            return FakeResult([self.investment] if self.investment else [])
        if "FROM packages" in sql:
            return FakeResult([self.package] if self.package else [])
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


def test_early_exit_marks_session_ended():
    db, user, session, req = _env(watched=5)
    assert session.completed_at is None
    with pytest.raises(Exception):
        _complete(db, req)
    assert session.is_completed is False
    assert session.completed_at is not None


def test_ended_session_retry_rejected_without_new_penalty():
    db, user, session, req = _env(watched=5)
    session.completed_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    before_errors = user.error_count
    before_wallet = user.ad_view_wallet
    with pytest.raises(Exception) as exc:
        _complete(db, req)
    assert "already ended" in str(exc.value.detail).lower()
    assert user.error_count == before_errors
    assert user.ad_view_wallet == before_wallet
    assert not [o for o in db.added if isinstance(o, TaskError)]
    assert session.is_completed is False


def test_adview_complete_select_uses_row_lock():
    db, user, session, req = _env(watched=5)
    try:
        _complete(db, req)
    except Exception:
        pass
    selects = [s for s in db.seen_sql if "ad_views" in s and s.lstrip().upper().startswith("SELECT")]
    assert selects, "session must be read via SELECT"
    assert any("FOR UPDATE" in s for s in selects), "complete SELECT must carry FOR UPDATE"


def _start_env(typed=5, consumed=()):
    user = User(
        id=1,
        email="adstart@oxford.com",
        username="ad_start_tester",
        account_status="active",
        error_count=0,
        hold_count=0,
        suspension_count=0,
        ad_view_wallet=Decimal("0"),
    )
    investment = Investment(
        user_id=1,
        status="active",
        package_name="AdPack",
        daily_captcha_limit=20,
        captchas_typed_today=typed,
        captchas_expired_today=0,
        last_captcha_date=date.today(),
    )
    package = Package(
        name="AdPack",
        is_active=True,
        task_type=TaskType.ad_view,
        daily_captcha_limit=20,
        ad_duration_seconds=30,
    )
    db = FakeSession(user, None, None, {})
    db.investment = investment
    db.package = package
    db.ads_list = [
        Ad(id=1, video_id="v1", title="A1", thumbnail=None, required_watch_seconds=30),
        Ad(id=2, video_id="v2", title="A2", thumbnail=None, required_watch_seconds=30),
        Ad(id=3, video_id="v3", title="A3", thumbnail=None, required_watch_seconds=30),
    ]
    db.consumed_ids = list(consumed)
    req = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"), headers={})
    return db, user, investment, req


def _start(db, req):
    return run(ads.start_ad.__wrapped__(req, 1, db))


def test_start_skips_consumed_ads():
    db, user, inv, req = _start_env(typed=5, consumed=[1])
    resp = _start(db, req)
    assert resp["ad_id"] in (2, 3)
    assert inv.captchas_typed_today == 5 + 1
    created = [o for o in db.added if isinstance(o, AdView)]
    assert len(created) == 1 and not created[0].is_completed


def test_start_falls_back_when_all_consumed():
    # Repeat views must still be possible so the daily earning limit
    # stays reachable when only a few distinct ads exist.
    db, user, inv, req = _start_env(typed=5, consumed=[1, 2, 3])
    resp = _start(db, req)
    assert resp["ad_id"] in (1, 2, 3)
    assert inv.captchas_typed_today == 5 + 1


def _abandon(db, req, vid=777):
    return run(ads.abandon_ad.__wrapped__(req, vid, 1, db))


def test_abandon_open_session_ends_without_reward_or_error():
    db, user, session, req = _env(watched=5)
    resp = _abandon(db, req)
    assert resp["success"] is True and resp["ended"] is True
    assert session.is_completed is False
    assert session.completed_at is not None
    assert user.error_count == 0
    assert float(user.ad_view_wallet or 0) == 0
    assert not [o for o in db.added if isinstance(o, TaskError)]


def test_abandon_then_complete_pays_nothing():
    db, user, session, req = _env(watched=5)
    _abandon(db, req)
    with pytest.raises(Exception) as exc:
        _complete(db, req)
    assert "already ended" in str(exc.value.detail).lower()
    assert user.error_count == 0
    assert float(user.ad_view_wallet or 0) == 0
    assert session.is_completed is False


def test_abandon_completed_session_is_noop():
    db, user, session, req = _env(watched=60, completed=True)
    session.is_completed = True
    session.completed_at = datetime.now(timezone.utc)
    resp = _abandon(db, req)
    assert resp["success"] is True and resp["ended"] is False
    assert user.error_count == 0


def test_abandon_unknown_or_foreign_session_is_noop():
    db, user, session, req = _env(watched=5)
    resp = _abandon(db, req, vid=9999)
    assert resp["success"] is True and resp["ended"] is False
    assert session.completed_at is None
    assert user.error_count == 0


def test_completed_session_rejected_without_side_effects():
    db, user, session, req = _env(watched=60, completed=True)
    session.is_completed = True
    with pytest.raises(Exception) as exc:
        _complete(db, req)
    assert "already completed" in str(exc.value.detail).lower()
    assert user.error_count == 0
    assert not [o for o in db.added if isinstance(o, TaskError)]
