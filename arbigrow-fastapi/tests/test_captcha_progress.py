"""Progress-accounting tests for CAPTCHA submissions (real endpoint logic).

Business rule under test:
  * every validated submission increments Task Progress by exactly 1,
    whether the answer is correct or wrong;
  * correct answers award earnings, wrong answers do not (but log an error);
  * the same challenge submitted twice counts once (is_used guard);
  * malformed/expired submissions are rejected without consuming progress.

Runs the real ``submit_captcha`` coroutine (unwrapped from the rate-limit
decorator) against an in-memory fake session — no database required.
"""
import asyncio
import re
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest

import app.api.v1.captcha as cap
from app.models.captcha import CaptchaChallenge, CaptchaEarning
from app.models.investments import Investment
from app.models.package import Package, TaskType
from app.models.task_errors import TaskAttempt, TaskDisciplinaryConfig, TaskError
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
    """Serves preset ORM objects based on the compiled SQL. Mutations apply
    to the in-memory objects; commit/refresh/flush are no-ops."""

    def __init__(self, user, investment, package, challenges, configs):
        self.user = user
        self.investment = investment
        self.package = package
        self.challenges = dict(challenges)
        self.configs = configs
        self.added = []
        self.attempts = []
        self.seen_sql = []

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        self.seen_sql.append(sql)
        if "task_disciplinary_config" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            return FakeResult([self.configs[m.group(1)]] if m and m.group(1) in self.configs else [])
        if "captcha_challenges" in sql and sql.lstrip().upper().startswith("UPDATE"):
            m = re.search(r"captcha_challenges\.id = (\d+)", sql)
            ch = self.challenges.get(int(m.group(1))) if m else None
            if ch is not None and ch.is_used is False:
                ch.is_used = True
                return FakeUpdateResult(1)
            return FakeUpdateResult(0)
        if "captcha_challenges" in sql and not sql.lstrip().upper().startswith("UPDATE"):
            m = re.search(r"captcha_challenges\.id = (\d+)", sql)
            ch = self.challenges.get(int(m.group(1))) if m else None
            return FakeResult([ch] if ch else [])
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
        return None

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


def _env(typed=4, limit=10, earn="0.50000000000000", text="K7M9QA", used=False, expired=False):
    user = User(
        id=1,
        email="prog@oxford.com",
        username="progress_tester",
        account_status="active",
        error_count=0,
        hold_count=0,
        suspension_count=0,
        captcha_wallet=Decimal("0"),
    )
    investment = Investment(
        user_id=1,
        status="active",
        package_name="StarterCaptcha",
        daily_captcha_limit=limit,
        captchas_typed_today=typed,
        captchas_expired_today=0,
        last_captcha_date=date.today(),
        earn_per_captcha=Decimal(earn),
    )
    package = Package(name="StarterCaptcha", is_active=True, task_type=TaskType.captcha)
    challenge = CaptchaChallenge(
        id=101,
        user_id=1,
        captcha_text_hash=cap._hash_captcha(text, "testsalt"),
        salt="testsalt",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=-5 if expired else 2),
        is_used=used,
    )
    configs = {
        "hold_threshold": _cfg("hold_threshold", "3"),
        "suspension_threshold": _cfg("suspension_threshold", "5"),
        "max_hold_per_cycle": _cfg("max_hold_per_cycle", "1"),
    }
    db = FakeSession(user, investment, package, [(101, challenge)], configs)
    req = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"), headers={})
    return db, user, investment, req


def _submit(db, req, text, cid=101):
    body = SimpleNamespace(captcha_id=cid, user_input=text)
    return run(cap.submit_captcha.__wrapped__(req, body, 1, db))


def test_submit_correct_increments_progress_and_awards():
    db, user, inv, req = _env(typed=4)
    before_wallet = user.captcha_wallet
    resp = _submit(db, req, "K7M9QA")
    assert resp.success is True
    assert inv.captchas_typed_today == 5
    assert float(resp.earned) > 0
    assert user.captcha_wallet > before_wallet
    assert resp.remaining_today == 10 - 5


def test_submit_wrong_increments_progress_no_earning_logs_error():
    db, user, inv, req = _env(typed=4)
    before_wallet = user.captcha_wallet
    resp = _submit(db, req, "WR0NGX")
    assert resp.success is False
    assert inv.captchas_typed_today == 5
    assert float(resp.earned) == 0
    assert user.captcha_wallet == before_wallet
    assert user.error_count == 1
    assert any(isinstance(o, TaskError) for o in db.added)


def test_multiple_wrong_submissions_accumulate():
    db, user, inv, req = _env(typed=7)
    for i, wrong in enumerate(("AAAAAA", "BBBBBB", "CCCCCC")):
        ch = CaptchaChallenge(
            id=200 + i,
            user_id=1,
            captcha_text_hash=cap._hash_captcha("K7M9QA", "testsalt"),
            salt="testsalt",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=2),
            is_used=False,
        )
        db.challenges[200 + i] = ch
        body = SimpleNamespace(captcha_id=200 + i, user_input=wrong)
        resp = run(cap.submit_captcha.__wrapped__(req, body, 1, db))
        assert resp.success is False
    assert inv.captchas_typed_today == 7 + 3
    assert user.error_count == 3


def test_same_submission_not_counted_twice():
    db, user, inv, req = _env(typed=4)
    resp = _submit(db, req, "WR0NGX")
    assert resp.success is False
    assert inv.captchas_typed_today == 5
    with pytest.raises(Exception) as exc:
        _submit(db, req, "K7M9QA")
    assert "already used" in str(exc.value.detail).lower()
    assert inv.captchas_typed_today == 5


def test_expired_wrong_keeps_timeout_behavior():
    db, user, inv, req = _env(typed=4, expired=True)
    with pytest.raises(Exception) as exc:
        _submit(db, req, "WR0NGX")
    assert "expired" in str(exc.value.detail).lower()
    assert inv.captchas_typed_today == 4 + 1
    assert user.error_count == 1
    assert not [o for o in db.added if isinstance(o, CaptchaEarning) and float(o.amount_earned or 0) > 0]


def test_expired_correct_completes_with_earning():
    # A successfully completed task counts even when the countdown is over.
    db, user, inv, req = _env(typed=4, expired=True)
    before_wallet = user.captcha_wallet
    resp = _submit(db, req, "K7M9QA")
    assert resp.success is True
    assert inv.captchas_typed_today == 4 + 1
    assert float(resp.earned) > 0
    assert user.captcha_wallet > before_wallet
    assert user.error_count == 0


def test_expire_ping_counts_unsubmitted_task_once():
    db, user, inv, req = _env(typed=4)
    resp = run(cap.expire_captcha.__wrapped__(req, {"captcha_id": 101}, 1, db))
    assert resp["success"] is True
    assert resp["typed_today"] == 5
    assert inv.captchas_typed_today == 5
    assert user.error_count == 0
    assert not [o for o in db.added if isinstance(o, CaptchaEarning)]


def test_expire_ping_is_idempotent():
    db, user, inv, req = _env(typed=4)
    run(cap.expire_captcha.__wrapped__(req, {"captcha_id": 101}, 1, db))
    resp = run(cap.expire_captcha.__wrapped__(req, {"captcha_id": 101}, 1, db))
    assert resp["typed_today"] == 5
    assert inv.captchas_typed_today == 5


def test_expire_ping_then_submit_no_double_count():
    db, user, inv, req = _env(typed=4)
    run(cap.expire_captcha.__wrapped__(req, {"captcha_id": 101}, 1, db))
    assert inv.captchas_typed_today == 5
    with pytest.raises(Exception) as exc:
        _submit(db, req, "K7M9QA")
    assert "already used" in str(exc.value.detail).lower()
    assert inv.captchas_typed_today == 5


def test_expire_ping_without_known_challenge_counts_nothing():
    db, user, inv, req = _env(typed=4)
    resp = run(cap.expire_captcha.__wrapped__(req, {}, 1, db))
    assert resp["typed_today"] == 4
    resp = run(cap.expire_captcha.__wrapped__(req, {"captcha_id": 9999}, 1, db))
    assert resp["typed_today"] == 4
    assert inv.captchas_typed_today == 4


def test_challenge_select_uses_row_lock_against_races():
    # Concurrent duplicate submits must serialize on the challenge row so
    # exactly one of them can consume it (single progress increment).
    db, user, inv, req = _env(typed=4)
    _submit(db, req, "WR0NGX")
    selects = [s for s in db.seen_sql if "captcha_challenges" in s and s.lstrip().upper().startswith("SELECT")]
    assert selects, "challenge must be read via SELECT"
    assert any("FOR UPDATE" in s for s in selects), "challenge SELECT must carry FOR UPDATE"
