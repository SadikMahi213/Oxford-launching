"""Focused tests for Account Hold / Suspension threshold progression.

Business rule under test (configurable, defaults hold=3 / suspension=5):
  1 -> Normal (warning)      2 -> Normal (warning)
  3 -> Hold                  (hold expiry keeps cumulative progression)
  4 -> No new hold, no suspension
  5 -> Suspension (overrides hold)

A threshold of 0 disables that action.
"""
import asyncio
import re
from datetime import datetime, timezone

import pytest

from app.models.task_errors import TaskDisciplinaryConfig
from app.models.user import User
from app.services.task_error_service import (
    STATUS_ACTIVE,
    STATUS_ON_HOLD,
    STATUS_PERMANENTLY_CLOSED,
    STATUS_SUSPENDED,
    _evaluate_thresholds,
)


class FakeResult:
    def __init__(self, obj):
        self.obj = obj

    def scalar_one_or_none(self):
        return self.obj

    def scalar(self):
        return self.obj


class FakeSession:
    def __init__(self, configs):
        self.configs = configs
        self.added = []

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "task_disciplinary_config" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            key = m.group(1) if m else None
            return FakeResult(self.configs.get(key))
        return FakeResult(None)

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        return None


def _cfg(key, value):
    return TaskDisciplinaryConfig(key=key, value=value)


def run(coro):
    return asyncio.run(coro)


def _session(hold=3, susp=5, max_hold=1):
    return FakeSession(
        {
            "hold_threshold": _cfg("hold_threshold", str(hold)),
            "suspension_threshold": _cfg("suspension_threshold", str(susp)),
            "max_hold_per_cycle": _cfg("max_hold_per_cycle", str(max_hold)),
        }
    )


def _user(**kwargs):
    params = {
        "id": 1,
        "email": "t@oxford.com",
        "username": "threshold_tester",
        "account_status": STATUS_ACTIVE,
        "error_count": 0,
        "hold_count": 0,
        "suspension_count": 0,
    }
    params.update(kwargs)
    return User(**params)


class _Err:
    def __init__(self):
        self.id = 1
        self.task_type = "captcha"


async def _step(db, user, count):
    user.error_count = count
    return await _evaluate_thresholds(db, user, _Err(), datetime.now(timezone.utc))


def test_hold_fires_exactly_at_3():
    db, user = _session(), _user()
    assert run(_step(db, user, 1)) == "warning"
    assert user.account_status == STATUS_ACTIVE
    assert run(_step(db, user, 2)) == "warning"
    assert user.account_status == STATUS_ACTIVE
    assert run(_step(db, user, 3)) == "hold"
    assert user.account_status == STATUS_ON_HOLD
    assert user.hold_count == 1
    assert user.hold_until is not None


def test_no_repeat_hold_at_4_after_expiry():
    db, user = _session(), _user()
    for c in (1, 2, 3):
        run(_step(db, user, c))
    assert user.account_status == STATUS_ON_HOLD
    # Hold expiry: status back to active, progression retained
    user.account_status = STATUS_ACTIVE
    user.hold_until = None
    assert run(_step(db, user, 4)) == "none"
    assert user.account_status == STATUS_ACTIVE


def test_suspension_at_5_overrides_hold():
    db, user = _session(), _user()
    for c in (1, 2, 3):
        run(_step(db, user, c))
    user.account_status = STATUS_ACTIVE  # hold expired
    user.hold_until = None
    assert run(_step(db, user, 4)) == "none"
    assert run(_step(db, user, 5)) == "suspension"
    assert user.account_status == STATUS_SUSPENDED
    assert user.hold_until is None  # hold state cleared by suspension


def test_suspension_fires_even_while_on_hold():
    db, user = _session(), _user()
    user.error_count = 4
    user.account_status = STATUS_ON_HOLD  # hold not yet expired
    assert run(_step(db, user, 5)) == "suspension"
    assert user.account_status == STATUS_SUSPENDED


def test_hold_disabled_when_threshold_zero():
    db, user = _session(hold=0, susp=5), _user()
    for c in (1, 2, 3, 4):
        assert run(_step(db, user, c)) == "none"
        assert user.account_status == STATUS_ACTIVE
    assert run(_step(db, user, 5)) == "suspension"


def test_suspension_disabled_when_threshold_zero():
    db, user = _session(hold=3, susp=0), _user()
    assert run(_step(db, user, 3)) == "hold"
    user.account_status = STATUS_ACTIVE
    user.hold_until = None
    assert run(_step(db, user, 4)) == "none"
    assert run(_step(db, user, 5)) == "none"
    assert user.account_status == STATUS_ACTIVE


def test_custom_thresholds_respected():
    db, user = _session(hold=2, susp=4), _user()
    assert run(_step(db, user, 1)) == "warning"
    assert run(_step(db, user, 2)) == "hold"
    user.account_status = STATUS_ACTIVE
    user.hold_until = None
    assert run(_step(db, user, 3)) == "none"
    assert run(_step(db, user, 4)) == "suspension"


def test_permanently_closed_never_downgraded():
    db = _session()
    user = _user(account_status=STATUS_PERMANENTLY_CLOSED, error_count=99)
    assert run(_step(db, user, 99)) == "none"
    assert user.account_status == STATUS_PERMANENTLY_CLOSED
