import re
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.api.v1 import deps
from app.api.v1.user import notify_admin
from app.main import app
from app.models.system_config import SystemConfig
from app.models.user import User


def _cfg(key, value):
    return SystemConfig(key=key, value=value)


class FakeResult:
    def __init__(self, obj):
        self.obj = obj

    def scalar_one_or_none(self):
        return self.obj

    def scalar(self):
        return self.obj

    def scalars(self):
        return self

    def all(self):
        return [self.obj] if self.obj is not None else []

    def __iter__(self):
        return iter([self.obj] if self.obj is not None else [])


class FakeSession:
    """Same minimal stand-in as test_transfer_minimum: serves preset
    SystemConfig rows and User rows; mutations apply to in-memory objects."""

    def __init__(self, users, configs):
        self._by_email = {u.email: u for u in users}
        self._by_username = {u.username: u for u in users}
        self._by_id = {u.id: u for u in users}
        self.configs = configs
        self.added = []

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "system_config" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            key = m.group(1) if m else None
            return FakeResult(self.configs.get(key))
        if "users" in sql:
            if "users.id =" in sql:
                uid = int(re.search(r"users\.id = (\d+)", sql).group(1))
                return FakeResult(self._by_id.get(uid))
            if "users.email =" in sql:
                email = re.search(r"users\.email = '([^']+)'", sql).group(1)
                return FakeResult(self._by_email.get(email))
            if "users.username =" in sql:
                uname = re.search(r"users\.username = '([^']+)'", sql).group(1)
                return FakeResult(self._by_username.get(uname))
        return FakeResult(None)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        return None

    async def refresh(self, obj):
        return None


@pytest.fixture
def env(monkeypatch):
    sender = User(
        id=1,
        email="sender@oxford.com",
        username="sender",
        full_name="Sender",
        main_wallet=Decimal("1000"),
        matching_bonus_wallet=Decimal("1000"),
        account_status="active",
    )
    recipient = User(
        id=2,
        email="rec@oxford.com",
        username="rec",
        full_name="Recipient",
        main_wallet=Decimal("0"),
        account_status="active",
    )
    configs = {
        "min_user_transfer_amount": _cfg("min_user_transfer_amount", "0"),
    }
    sess = FakeSession([sender, recipient], configs)

    async def override_db():
        yield sess

    app.dependency_overrides[deps.get_current_user] = lambda: sender
    app.dependency_overrides[deps.get_db] = override_db

    async def _noop_notify(**kwargs):
        return None

    monkeypatch.setattr("app.api.v1.user.notify_admin", _noop_notify)
    monkeypatch.setattr("app.utils.kyc_helper.is_kyc_approved", lambda *a, **k: True)

    try:
        app.state.limiter.enabled = False
    except Exception:
        pass

    from fastapi.testclient import TestClient

    client = TestClient(app)

    yield {"client": client, "sender": sender, "recipient": recipient,
           "configs": configs, "sess": sess}

    app.dependency_overrides.clear()


def _set_fee(env, value):
    if value is None:
        env["configs"].pop("transfer_charge_percent", None)
    else:
        env["configs"]["transfer_charge_percent"] = _cfg("transfer_charge_percent", value)


def _reset(env):
    env["sender"].main_wallet = Decimal("1000")
    env["sender"].matching_bonus_wallet = Decimal("1000")
    env["recipient"].main_wallet = Decimal("0")


def _send(env, amount):
    return env["client"].post(
        "/api/v1/user/send-funds",
        json={"recipient": env["recipient"].email, "amount": amount},
        headers={"Authorization": "Bearer test"},
    )


def _send_mb(env, amount):
    return env["client"].post(
        "/api/v1/user/transfer-matching-bonus",
        json={"recipient": env["recipient"].email, "amount": amount},
        headers={"Authorization": "Bearer test"},
    )


# Fund transfer honors the configured 2% fee: 100 -> fee 2, net 98.
def test_send_funds_configured_two_percent(env):
    _set_fee(env, "2")
    _reset(env)
    r = _send(env, 100)
    assert r.status_code == 200
    body = r.json()
    assert body["charge_percent"] == 2.0
    assert body["charge"] == 2.0
    assert body["amount"] == 98.0
    assert env["sender"].main_wallet == Decimal("900")
    assert env["recipient"].main_wallet == Decimal("98")
    logs = [o for o in env["sess"].added if getattr(o, "sender_id", None) == 1]
    assert logs and float(logs[-1].fee) == 2.0


# Missing config falls back to the 2% policy default (not the old 5%).
def test_send_funds_default_is_two_percent(env):
    _set_fee(env, None)
    _reset(env)
    r = _send(env, 100)
    assert r.status_code == 200
    assert r.json()["charge"] == 2.0
    assert env["recipient"].main_wallet == Decimal("98")


# Matching-bonus transfers keep their own 5% default untouched.
def test_matching_bonus_transfer_stays_five_percent(env):
    _set_fee(env, "2")
    _reset(env)
    r = _send_mb(env, 100)
    assert r.status_code == 200
    assert r.json()["charge_percent"] == 5.0
    assert r.json()["charge"] == 5.0
    assert env["recipient"].main_wallet == Decimal("95")
    assert env["sender"].matching_bonus_wallet == Decimal("900")


# Matching-bonus transfers honor their own dedicated key when configured.
def test_matching_bonus_transfer_own_key(env):
    env["configs"]["matching_bonus_transfer_charge_percent"] = _cfg(
        "matching_bonus_transfer_charge_percent", "3")
    _reset(env)
    r = _send_mb(env, 100)
    assert r.status_code == 200
    assert r.json()["charge"] == 3.0
    assert env["recipient"].main_wallet == Decimal("97")
