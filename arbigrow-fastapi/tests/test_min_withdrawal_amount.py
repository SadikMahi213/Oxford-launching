"""Dynamic minimum withdrawal amount (admin-configured floor).

Backend: `min_withdrawal_amount` in system_config (via fee-config),
enforced in POST /withdrawals/ as max(method min, global floor),
exposed via GET /withdrawal-methods/active for the frontend.
No real database is touched (FakeSession).
"""
import re
from decimal import Decimal

import pytest

from app.api.v1 import deps
from app.main import app
from app.models.system_config import SystemConfig
from app.models.user import User
from app.models.withdrawal import Withdrawal
from app.models.withdrawal_method import WithdrawalMethod


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

    def first(self):
        return self.rows[0] if self.rows else None

    def __iter__(self):
        return iter(self.rows)


class FakeSession:
    def __init__(self, user, method, configs):
        self.user = user
        self.method = method
        self.configs = configs
        self.withdrawals = []
        self._next_id = 500

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "system_config" in sql:
            m = re.search(r"key = '([^']+)'", sql)
            key = m.group(1) if m else None
            return FakeResult(self.configs.get(key))
        if "withdrawal_methods" in sql:
            m = re.search(r"withdrawal_methods\.id = (\d+)", sql)
            if m and int(m.group(1)) != self.method.id:
                return FakeResult(None)
            if "status = true" in sql.lower() and not self.method.status:
                return FakeResult(None)
            return FakeResult(self.method)
        if "users" in sql:
            return FakeResult(self.user)
        return FakeResult(None)

    def add(self, obj):
        if isinstance(obj, Withdrawal):
            if getattr(obj, "id", None) is None:
                obj.id = self._next_id
                self._next_id += 1
            self.withdrawals.append(obj)
        if isinstance(obj, SystemConfig):
            self.configs[obj.key] = obj

    async def flush(self):
        return None

    async def commit(self):
        return None

    async def refresh(self, obj):
        return None


@pytest.fixture
def env(monkeypatch):
    user = User(
        id=1,
        email="wd@oxford.com",
        username="wd",
        full_name="Wd",
        main_wallet=Decimal("1000"),
        account_status="active",
    )
    admin = User(
        id=9,
        email="admin@oxford.com",
        username="admin",
        full_name="Admin",
        main_wallet=Decimal("0"),
        account_status="active",
        is_admin=True,
    )
    method = WithdrawalMethod(
        id=1,
        method_type="network",
        name="USDT-TRC20",
        display_name="USDT TRC20",
        status=True,
        min_amount=Decimal("10"),
        max_amount=Decimal("700"),
    )
    configs = {"system_withdrawal_enabled": _cfg("system_withdrawal_enabled", "true")}
    sess = FakeSession(user, method, configs)

    async def override_db():
        yield sess

    app.dependency_overrides[deps.get_current_user] = lambda: user
    app.dependency_overrides[deps.get_current_admin_user] = lambda: admin
    app.dependency_overrides[deps.get_db] = override_db
    try:
        from app.core import database as core_db
        app.dependency_overrides[core_db.get_db] = override_db
    except Exception:
        pass

    async def _noop_kyc(*a, **k):
        return None

    async def _noop_notify(**kwargs):
        return None

    monkeypatch.setattr("app.api.v1.withdrawals.check_kyc_approved", _noop_kyc)
    monkeypatch.setattr("app.api.v1.withdrawals.notify_admin", _noop_notify)

    try:
        app.state.limiter.enabled = False
    except Exception:
        pass

    from fastapi.testclient import TestClient

    client = TestClient(app)
    yield {"client": client, "user": user, "method": method,
           "configs": configs, "sess": sess}
    app.dependency_overrides.clear()


def _withdraw(env, amount):
    return env["client"].post(
        "/api/v1/withdrawals/",
        json={
            "source_wallet": "main_wallet",
            "withdrawal_method_id": 1,
            "amount": amount,
            "destination_address": "0xABCDEF1234567890",
        },
        headers={"Authorization": "Bearer test"},
    )


def _set_min(env, value):
    env["configs"]["min_withdrawal_amount"] = _cfg("min_withdrawal_amount", value)


# ── Backend enforcement (Tests A–E) ──────────────────────────────────
def test_below_default_minimum_rejected(env):
    r = _withdraw(env, 5)
    assert r.status_code == 400
    assert r.json()["detail"] == "Minimum withdrawal amount is 10 USDT"
    assert env["sess"].withdrawals == []


def test_equal_and_above_default_minimum_allowed(env):
    assert _withdraw(env, 10).status_code == 200
    assert _withdraw(env, 15).status_code == 200
    assert len(env["sess"].withdrawals) == 2


def test_configured_25_blocks_10_allows_25(env):
    _set_min(env, "25")
    r = _withdraw(env, 10)
    assert r.status_code == 400
    assert r.json()["detail"] == "Minimum withdrawal amount is 25 USDT"
    assert _withdraw(env, 25).status_code == 200
    assert len(env["sess"].withdrawals) == 1


def test_method_minimum_preserved_above_global(env):
    _set_min(env, "25")
    env["method"].min_amount = Decimal("50")
    r = _withdraw(env, 30)
    assert r.status_code == 400
    assert "50" in r.json()["detail"]
    assert _withdraw(env, 50).status_code == 200


# ── Admin config API (Tests F–G) ─────────────────────────────────────
def test_admin_rejects_invalid_values(env):
    for bad in ["0", "-10", "", "abc"]:
        r = env["client"].put(
            "/api/v1/admin/fee-config/min_withdrawal_amount",
            json={"value": bad},
            headers={"Authorization": "Bearer test"},
        )
        assert r.status_code == 400, bad


def test_admin_roundtrip_persists(env):
    r = env["client"].put(
        "/api/v1/admin/fee-config/min_withdrawal_amount",
        json={"value": "25"},
        headers={"Authorization": "Bearer test"},
    )
    assert r.status_code == 200
    assert "25" in r.json()["message"]
    r = env["client"].get(
        "/api/v1/admin/fee-config",
        headers={"Authorization": "Bearer test"},
    )
    assert r.status_code == 200
    assert r.json()["data"]["min_withdrawal_amount"] == "25"


def test_fee_config_default_is_10(env):
    r = env["client"].get(
        "/api/v1/admin/fee-config",
        headers={"Authorization": "Bearer test"},
    )
    assert r.status_code == 200
    assert r.json()["data"]["min_withdrawal_amount"] == "10"


def test_active_methods_expose_global_min(env):
    r = env["client"].get("/api/v1/withdrawal-methods/active")
    assert r.status_code == 200
    assert r.json()["global_min_withdrawal_amount"] == "10"
    _set_min(env, "25")
    r = env["client"].get("/api/v1/withdrawal-methods/active")
    assert r.json()["global_min_withdrawal_amount"] == "25"
