"""Registration toggle + one-zero-value-package-per-user rule.

Uses the same TestClient + dependency-override + FakeSession pattern as
test_transfer_minimum.py. No real database is touched.
"""
import re
from decimal import Decimal

import pytest

from app.api.v1 import deps
from app.main import app
from app.models.investments import Investment
from app.models.package import Package
from app.models.system_config import SystemConfig
from app.models.user import User


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

    def all(self):
        return self.rows

    def __iter__(self):
        return iter(self.rows)


class FakeSession:
    """Routes compiled SQL to in-memory users/packages/investments/configs.

    `db.add` persists Investment rows into the in-memory list so a second
    purchase attempt observes the first one, mirroring committed state.
    """

    def __init__(self, users, packages, configs):
        self._by_id = {u.id: u for u in users}
        self._by_email = {u.email: u for u in users}
        self._packages = {p.name: p for p in packages}
        self.configs = configs
        self.investments = []
        self._next_id = 1000

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "system_config" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            key = m.group(1) if m else None
            return FakeResult(self.configs.get(key))
        if "FROM packages" in sql or "packages" in sql and "package_name" not in sql and "investments" not in sql:
            m = re.search(r"name = '([^']+)'", sql)
            name = m.group(1) if m else None
            pkg = self._packages.get(name)
            if pkg is not None and not getattr(pkg, "is_active", True):
                pkg = None
            return FakeResult(pkg)
        if "investments" in sql:
            uid = int(re.search(r"user_id = (\d+)", sql).group(1))
            # NOTE: match the WHERE predicate, not the SELECT column list
            # (the same-name lookup also selects invested_amount).
            if "invested_amount = 0" in sql:
                rows = [
                    inv for inv in self.investments
                    if inv.user_id == uid
                    and Decimal(str(inv.invested_amount)) == 0
                    and inv.status in ("active", "completed")
                ]
                first = rows[0] if rows else None
                return FakeResult(first, rows)
            m = re.search(r"package_name = '([^']+)'", sql)
            name = m.group(1) if m else None
            rows = [
                inv for inv in self.investments
                if inv.user_id == uid and (name is None or inv.package_name == name)
            ]
            first = rows[0] if rows else None
            return FakeResult(first, rows)
        if "users" in sql:
            if "users.id =" in sql:
                uid = int(re.search(r"users\.id = (\d+)", sql).group(1))
                return FakeResult(self._by_id.get(uid))
            m = re.search(r"=\s*'([^']+@[^']+)'", sql)
            if m:
                email = m.group(1).lower()
                return FakeResult(self._by_email.get(email))
            return FakeResult(None)
        return FakeResult(None)

    def add(self, obj):
        if isinstance(obj, Investment):
            if getattr(obj, "id", None) is None:
                obj.id = self._next_id
                self._next_id += 1
            self.investments.append(obj)

    async def commit(self):
        return None

    async def refresh(self, obj):
        return None


def _free_package(name):
    return Package(
        id=1 if name == "Free" else 2,
        name=name,
        investment_amount=Decimal("0"),
        total_return=Decimal("0"),
        daily_payment=Decimal("0"),
        duration_days=365,
        captcha_required_per_day=0,
        is_active=True,
    )


@pytest.fixture
def env(monkeypatch):
    user = User(
        id=7,
        email="buyer@oxford.com",
        username="buyer",
        full_name="Buyer",
        main_wallet=Decimal("0"),
        deposit_wallet=Decimal("0"),
        account_status="active",
        parent_lvl_1_id=None,
    )
    sess = FakeSession([user], [_free_package("Free"), _free_package("Free2")], {})

    async def override_db():
        yield sess

    app.dependency_overrides[deps.get_current_user] = lambda: user
    app.dependency_overrides[deps.get_db] = override_db
    try:
        from app.core import database as core_db
        app.dependency_overrides[core_db.get_db] = override_db
    except Exception:
        pass

    async def _noop_notify(**kwargs):
        return None

    monkeypatch.setattr("app.api.v1.investments.notify_admin", _noop_notify)
    monkeypatch.setattr("app.api.v1.auth.notify_admin", _noop_notify)

    try:
        app.state.limiter.enabled = False
    except Exception:
        pass

    from fastapi.testclient import TestClient

    client = TestClient(app)
    yield {"client": client, "user": user, "sess": sess}
    app.dependency_overrides.clear()


def _signup(env, email="newbie@oxford.com"):
    return env["client"].post(
        "/api/v1/auth/signup",
        json={"full_name": "New Bie", "email": email, "password": "Secret123!"},
    )


def _buy(env, package_name, amount):
    return env["client"].post(
        "/api/v1/investments/buy",
        json={"package_name": package_name, "amount": amount},
        headers={"Authorization": "Bearer test"},
    )


# ── Registration toggle ──────────────────────────────────────────────

def test_signup_rejected_when_disabled(env):
    env["sess"].configs["system_registration_enabled"] = _cfg(
        "system_registration_enabled", "false"
    )
    r = _signup(env)
    assert r.status_code == 403
    assert "disabled" in r.json()["detail"].lower()


def test_signup_allowed_when_enabled(env):
    env["sess"].configs["system_registration_enabled"] = _cfg(
        "system_registration_enabled", "true"
    )
    # Gate passes; an already-registered email is rejected by later validation,
    # proving the toggle did not block.
    r = _signup(env, email="buyer@oxford.com")
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"].lower()


def test_signup_allowed_when_unset(env):
    # No row -> default enabled; same downstream validation is reached.
    r = _signup(env, email="buyer@oxford.com")
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"].lower()


def test_registration_status_endpoint(env):
    r = env["client"].get("/api/v1/auth/registration-status")
    assert r.status_code == 200
    assert r.json() == {"enabled": True}
    env["sess"].configs["system_registration_enabled"] = _cfg(
        "system_registration_enabled", "false"
    )
    r = env["client"].get("/api/v1/auth/registration-status")
    assert r.json() == {"enabled": False}


# ── Zero-value package rule ──────────────────────────────────────────

def test_first_free_package_succeeds(env):
    r = _buy(env, "Free", 0)
    assert r.status_code == 200, r.text
    assert r.json()["invested_amount"] == "0" or r.json()["invested_amount"] == 0


def test_same_free_package_rejected(env):
    assert _buy(env, "Free", 0).status_code == 200
    r = _buy(env, "Free", 0)
    assert r.status_code == 400
    assert "already" in r.json()["detail"].lower()


def test_second_free_package_different_name_rejected(env):
    assert _buy(env, "Free", 0).status_code == 200
    r = _buy(env, "Free2", 0)
    assert r.status_code == 400
    assert r.json()["detail"] == "You have already used your zero-value package."


def test_non_success_status_does_not_block(env):
    env["sess"].investments.append(
        Investment(
            id=999,
            user_id=7,
            package_name="Free",
            invested_amount=Decimal("0"),
            roi_percent=Decimal("0"),
            expected_profit=Decimal("0"),
            status="cancelled",
        )
    )
    r = _buy(env, "Free2", 0)
    assert r.status_code == 200, r.text


def test_rejected_attempt_creates_nothing(env):
    assert _buy(env, "Free", 0).status_code == 200
    before = len(env["sess"].investments)
    assert _buy(env, "Free2", 0).status_code == 400
    assert len(env["sess"].investments) == before
