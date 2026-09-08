"""Daily ROI OFF global earning gate.

Covers: manual /admin/roi/apply, manual /admin/investments add-profit,
ad-view start/complete, captcha next/submit. Verifies that when OFF no
wallet changes and no earning/history rows are created, and that ON
behavior is unchanged. No real database is touched (FakeSession).
"""
import hashlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.api.v1 import deps
from app.core.security import get_current_user_id
from app.main import app
from app.models.ad_view import AdView
from app.models.captcha import CaptchaChallenge
from app.models.investments import Investment
from app.models.package import Package, TaskType
from app.models.roi_setting import ROISetting
from app.models.system_config import SystemConfig
from app.models.user import User
from app.utils.is_system_active import (
    DAILY_EARNING_DISABLED_DETAIL,
    is_daily_earning_enabled,
)


def _cfg(key, value):
    return SystemConfig(key=key, value=value)


class FakeResult:
    def __init__(self, obj=None, rows=None):
        self.obj = obj
        self.rows = rows if rows is not None else (
            [obj] if obj is not None else []
        )

    def scalar_one_or_none(self):
        return self.obj

    def scalar(self):
        return self.obj

    def scalars(self):
        return self

    def first(self):
        return self.rows[0] if self.rows else None

    def all(self):
        return self.rows

    def __iter__(self):
        return iter(self.rows)


class FakeSession:
    def __init__(self):
        self.configs = {}
        self.roi = {}
        self.users = {}
        self.packages = {}
        self.investments = []
        self.ad_views = {}
        self.challenges = {}
        self.added = []

    async def execute(self, stmt):
        import re

        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "system_config" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            return FakeResult(self.configs.get(m.group(1) if m else None))
        if "roi_settings" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            return FakeResult(self.roi.get(m.group(1) if m else None))
        if "user_ad_views" in sql:
            return FakeResult(None)
        if "ad_views" in sql:
            m = re.search(r"ad_views\.id = (\d+)", sql)
            obj = self.ad_views.get(int(m.group(1))) if m else None
            return FakeResult(obj)
        if "captcha_challenges" in sql:
            m = re.search(r"captcha_challenges\.id = (\d+)", sql)
            obj = self.challenges.get(int(m.group(1))) if m else None
            return FakeResult(obj)
        if "FROM packages" in sql or ("packages" in sql and "investments" not in sql):
            m = re.search(r"name = '([^']+)'", sql)
            return FakeResult(self.packages.get(m.group(1) if m else None))
        if "investments" in sql:
            rows = list(self.investments)
            m = re.search(r"user_id = (\d+)", sql)
            if m:
                rows = [r for r in rows if r.user_id == int(m.group(1))]
            m = re.search(r"status = '([^']+)'", sql)
            if m:
                rows = [r for r in rows if r.status == m.group(1)]
            m = re.search(r"package_name = '([^']+)'", sql)
            if m:
                rows = [r for r in rows if r.package_name == m.group(1)]
            return FakeResult(rows[0] if rows else None, rows)
        if "users" in sql:
            if " IN " in sql:
                return FakeResult(None, [])
            m = re.search(r"users\.id = (\d+)", sql)
            if m:
                return FakeResult(self.users.get(int(m.group(1))))
            return FakeResult(None)
        return FakeResult(None)

    async def get(self, model, ident):
        if model is User:
            return self.users.get(ident)
        return None

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        return None

    async def refresh(self, obj):
        return None

    async def flush(self):
        return None

    async def rollback(self):
        return None


def _user(uid=7, admin=False):
    return User(
        id=uid,
        email=("admin@oxford.com" if admin else "earner@oxford.com"),
        username=("admin" if admin else "earner"),
        full_name=("Admin" if admin else "Earner"),
        main_wallet=Decimal("100"),
        deposit_wallet=Decimal("0"),
        ad_view_wallet=Decimal("0"),
        captcha_wallet=Decimal("0"),
        referral_wallet=Decimal("0"),
        generation_wallet=Decimal("0"),
        account_status="active",
        is_admin=admin,
        parent_lvl_1_id=None,
    )


def _investment(task_pkg="CapPack"):
    now = datetime.now(timezone.utc)
    return Investment(
        id=11,
        user_id=7,
        package_name=task_pkg,
        invested_amount=Decimal("100"),
        roi_percent=Decimal("100"),
        expected_profit=Decimal("200"),
        daily_payment=Decimal("5"),
        profit_earned=Decimal("0"),
        profit_percentage_paid=Decimal("0"),
        earn_per_captcha=Decimal("1.5"),
        daily_captcha_limit=100,
        captchas_typed_today=0,
        last_captcha_date=None,
        start_date=now - timedelta(days=1),
        end_date=now + timedelta(days=364),
        status="active",
    )


def _package(name, task_type):
    return Package(
        id=1,
        name=name,
        investment_amount=Decimal("100"),
        total_return=Decimal("200"),
        daily_payment=Decimal("5"),
        duration_days=365,
        captcha_required_per_day=1,
        earn_per_captcha=Decimal("1.5"),
        daily_captcha_limit=100,
        task_type=task_type,
        is_active=True,
    )


@pytest.fixture
def env(monkeypatch):
    sess = FakeSession()
    user = _user()
    admin = _user(uid=9, admin=True)
    sess.users = {7: user, 9: admin}
    sess.packages = {
        "CapPack": _package("CapPack", TaskType.captcha),
        "AdPack": _package("AdPack", TaskType.ad_view),
    }
    sess.investments = [_investment()]
    now = datetime.now(timezone.utc)
    sess.ad_views = {
        21: AdView(
            id=21, user_id=7, ad_id=None,
            started_at=now - timedelta(seconds=60),
            is_completed=False, completed_at=None,
            amount_earned=Decimal("0"),
        )
    }
    sess.challenges = {
        31: CaptchaChallenge(
            id=31, user_id=7,
            captcha_text_hash=hashlib.sha256(("Ab12" + "s").encode()).hexdigest(),
            salt="s", is_used=False,
            expires_at=now + timedelta(minutes=5),
        )
    }
    sess.roi = {"global_daily_roi_percent": ROISetting(
        key="global_daily_roi_percent", roi_percent=Decimal("3"))}

    async def override_db():
        yield sess

    app.dependency_overrides[get_current_user_id] = lambda: 7
    app.dependency_overrides[deps.get_current_user] = lambda: user
    app.dependency_overrides[deps.get_current_admin_user] = lambda: admin
    app.dependency_overrides[deps.get_db] = override_db
    try:
        from app.core import database as core_db
        app.dependency_overrides[core_db.get_db] = override_db
    except Exception:
        pass

    async def _noop_notify(**kwargs):
        return None

    async def _allow_task(*a, **k):
        return {"allowed": True}

    async def _noop_attempt(*a, **k):
        return SimpleNamespace(id=1, attempt_number=1)

    async def _noop_err(*a, **k):
        return None

    monkeypatch.setattr("app.api.v1.ads.check_task_access", _allow_task)
    monkeypatch.setattr("app.api.v1.captcha.check_task_access", _allow_task)
    monkeypatch.setattr("app.api.v1.ads.log_task_attempt", _noop_attempt)
    monkeypatch.setattr("app.api.v1.ads.log_task_error", _noop_err)
    monkeypatch.setattr("app.api.v1.captcha.log_task_attempt", _noop_attempt)
    monkeypatch.setattr("app.api.v1.captcha.log_task_error", _noop_err)

    try:
        app.state.limiter.enabled = False
    except Exception:
        pass

    from fastapi.testclient import TestClient

    client = TestClient(app)
    yield {"client": client, "user": user, "sess": sess}
    app.dependency_overrides.clear()


def _off_toggle(env):
    env["sess"].configs["system_daily_earning_enabled"] = _cfg(
        "system_daily_earning_enabled", "false")


def _off_percent(env):
    env["sess"].roi["global_daily_roi_percent"] = ROISetting(
        key="global_daily_roi_percent", roi_percent=Decimal("0"))


# ── Helper unit checks ───────────────────────────────────────────────
def test_helper_enabled_by_default(env):
    import asyncio

    assert asyncio.run(is_daily_earning_enabled(env["sess"])) is True


def test_helper_disabled_by_toggle(env):
    import asyncio

    _off_toggle(env)
    assert asyncio.run(is_daily_earning_enabled(env["sess"])) is False


def test_helper_disabled_by_zero_percent(env):
    import asyncio

    _off_percent(env)
    assert asyncio.run(is_daily_earning_enabled(env["sess"])) is False


# ── Manual global ROI apply ──────────────────────────────────────────
def test_apply_blocked_when_off(env):
    _off_toggle(env)
    r = env["client"].post(
        "/api/v1/admin/roi/apply", headers={"Authorization": "Bearer test"})
    assert r.status_code == 403
    assert r.json()["detail"] == DAILY_EARNING_DISABLED_DETAIL
    assert env["user"].main_wallet == Decimal("100")
    assert env["sess"].added == []


def test_apply_blocked_by_zero_percent(env):
    _off_percent(env)
    r = env["client"].post(
        "/api/v1/admin/roi/apply", headers={"Authorization": "Bearer test"})
    assert r.status_code == 403
    assert env["user"].main_wallet == Decimal("100")
    assert env["sess"].added == []


def test_apply_works_when_on(env):
    r = env["client"].post(
        "/api/v1/admin/roi/apply", headers={"Authorization": "Bearer test"})
    assert r.status_code == 200, r.text
    assert r.json()["credited"] == 1
    assert env["user"].main_wallet == Decimal("103")
    assert len(env["sess"].added) == 1  # profit history only (no parents)


# ── Manual per-investment add-profit ─────────────────────────────────
def test_add_profit_blocked_when_off(env):
    _off_toggle(env)
    r = env["client"].post(
        "/api/v1/admin/investments/11/add-profit",
        json={"percentage": 1},
        headers={"Authorization": "Bearer test"})
    assert r.status_code == 403
    assert env["user"].main_wallet == Decimal("100")
    assert env["sess"].added == []


# ── Ad view ──────────────────────────────────────────────────────────
def test_ad_complete_blocked_when_off(env):
    env["sess"].investments = [_investment(task_pkg="AdPack")]
    _off_toggle(env)
    r = env["client"].post(
        "/api/v1/ads/complete", params={"ad_view_id": 21},
        headers={"Authorization": "Bearer test"})
    assert r.status_code == 403
    assert r.json()["detail"] == DAILY_EARNING_DISABLED_DETAIL
    assert env["user"].ad_view_wallet == Decimal("0")
    assert env["sess"].ad_views[21].is_completed is False
    assert env["sess"].added == []


def test_ad_complete_works_when_on(env):
    env["sess"].investments = [_investment(task_pkg="AdPack")]
    r = env["client"].post(
        "/api/v1/ads/complete", params={"ad_view_id": 21},
        headers={"Authorization": "Bearer test"})
    assert r.status_code == 200, r.text
    assert r.json()["earned"] == "1.5" or r.json()["earned"] == 1.5
    assert env["user"].ad_view_wallet == Decimal("1.5")
    assert env["sess"].ad_views[21].is_completed is True


def test_ad_start_blocked_when_off(env):
    _off_toggle(env)
    r = env["client"].get(
        "/api/v1/ads/start", headers={"Authorization": "Bearer test"})
    assert r.status_code == 403


# ── Captcha ──────────────────────────────────────────────────────────
def test_captcha_submit_blocked_when_off(env):
    _off_toggle(env)
    r = env["client"].post(
        "/api/v1/captcha/submit",
        json={"captcha_id": 31, "user_input": "Ab12"},
        headers={"Authorization": "Bearer test"})
    assert r.status_code == 403
    assert r.json()["detail"] == DAILY_EARNING_DISABLED_DETAIL
    assert env["user"].captcha_wallet == Decimal("0")
    assert env["sess"].challenges[31].is_used is False
    assert env["sess"].added == []


def test_captcha_submit_works_when_on(env):
    r = env["client"].post(
        "/api/v1/captcha/submit",
        json={"captcha_id": 31, "user_input": "Ab12"},
        headers={"Authorization": "Bearer test"})
    assert r.status_code == 200, r.text
    assert r.json()["success"] is True
    assert env["user"].captcha_wallet == Decimal("1.5")


def test_captcha_next_blocked_when_off(env):
    _off_toggle(env)
    r = env["client"].get(
        "/api/v1/captcha/next", headers={"Authorization": "Bearer test"})
    assert r.status_code == 403
