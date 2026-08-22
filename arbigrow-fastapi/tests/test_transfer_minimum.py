import re
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.api.v1 import deps
from app.api.v1.user import notify_admin
from app.main import app
from app.models.system_config import SystemConfig
from app.models.user import User
from app.utils.kyc_helper import is_kyc_approved


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
    """Minimal async-session stand-in that serves preset SystemConfig and User
    rows based on the compiled SQL. No real persistence — mutations are applied
    to the in-memory ORM objects so balance assertions remain meaningful."""

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

    def make_session(configs):
        sess = FakeSession([sender, recipient], configs)
        return sess

    # configs are mutable per-test
    configs = {
        "transfer_charge_percent": _cfg("transfer_charge_percent", "0"),
        "min_user_transfer_amount": _cfg("min_user_transfer_amount", "0"),
    }
    sess = make_session(configs)

    async def override_db():
        yield sess

    app.dependency_overrides[deps.get_current_user] = lambda: sender
    app.dependency_overrides[deps.get_db] = override_db

    # Neutralise side-effecting helpers so the test focuses on the transfer rule.
    async def _noop_notify(**kwargs):
        return None

    monkeypatch.setattr("app.api.v1.user.notify_admin", _noop_notify)
    monkeypatch.setattr("app.utils.kyc_helper.is_kyc_approved", lambda *a, **k: True)

    # Disable rate limiting for the test run.
    try:
        app.state.limiter.enabled = False
    except Exception:
        pass

    from fastapi.testclient import TestClient

    client = TestClient(app)

    yield {
        "client": client,
        "sender": sender,
        "recipient": recipient,
        "configs": configs,
        "sess": sess,
    }

    app.dependency_overrides.clear()


def _set_min(env, value):
    env["configs"]["min_user_transfer_amount"] = _cfg("min_user_transfer_amount", value)


def _send(env, amount):
    return env["client"].post(
        "/api/v1/user/send-funds",
        json={"recipient": env["recipient"].email, "amount": amount},
        headers={"Authorization": "Bearer test"},
    )


def _reset_balances(env):
    env["sender"].main_wallet = Decimal("1000")
    env["recipient"].main_wallet = Decimal("0")


# A. min=10, amount=5 -> REJECT
def test_below_min_rejected(env):
    _set_min(env, "10")
    _reset_balances(env)
    r = _send(env, 5)
    assert r.status_code == 400
    assert env["sender"].main_wallet == Decimal("1000")
    assert env["recipient"].main_wallet == Decimal("0")
    assert not any(isinstance(o, type(env["sender"])) and getattr(o, "sender_id", None) == env["sender"].id for o in env["sess"].added)


# B. min=10, amount=9.99 -> REJECT
def test_below_min_decimal_rejected(env):
    _set_min(env, "10")
    _reset_balances(env)
    r = _send(env, 9.99)
    assert r.status_code == 400
    assert env["sender"].main_wallet == Decimal("1000")


# C. min=10, amount=10 -> SUCCESS
def test_exact_min_allowed(env):
    _set_min(env, "10")
    _reset_balances(env)
    r = _send(env, 10)
    assert r.status_code == 200
    assert env["sender"].main_wallet == Decimal("990")
    assert env["recipient"].main_wallet == Decimal("10")


# D. min=10, amount=100 -> SUCCESS
def test_above_min_allowed(env):
    _set_min(env, "10")
    _reset_balances(env)
    r = _send(env, 100)
    assert r.status_code == 200
    assert env["sender"].main_wallet == Decimal("900")
    assert env["recipient"].main_wallet == Decimal("100")


# E. admin changes min 10 -> 25
def test_min_change_dynamic(env):
    _set_min(env, "10")
    _reset_balances(env)
    # At min=10, 20 is allowed (only matters once lowered threshold changes)
    assert _send(env, 20).status_code == 200
    _set_min(env, "25")
    _reset_balances(env)
    assert _send(env, 20).status_code == 400
    assert _send(env, 25).status_code == 200


# F. rejected transfer mutates nothing
def test_reject_no_mutation(env):
    _set_min(env, "10")
    _reset_balances(env)
    before_sender = env["sender"].main_wallet
    before_recipient = env["recipient"].main_wallet
    r = _send(env, 1)
    assert r.status_code == 400
    assert env["sender"].main_wallet == before_sender
    assert env["recipient"].main_wallet == before_recipient


# G. decimal boundary 10.50
def test_decimal_boundary(env):
    _set_min(env, "10.50")
    _reset_balances(env)
    assert _send(env, 10.49).status_code == 400
    _reset_balances(env)
    assert _send(env, 10.50).status_code == 200


# No minimum configured -> transfers allowed
def test_no_min_allows_any_positive(env):
    _set_min(env, "0")
    _reset_balances(env)
    assert _send(env, 1).status_code == 200
