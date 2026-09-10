"""Reject path of update_deposit_status must return 200 (not NameError/500).

Regression test for the unbound _deposit_id/_deposit_status bug: the return
block references both unconditionally, but they were assigned only inside
the approved branch. Approving behavior is locked in parallel.
"""
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.api.v1 import deps
from app.api.v1 import deposits as dep_mod
from app.main import app
from app.models.deposit import Deposit
from app.models.user import User
from app.schemas.deposit import DepositStatusUpdate


class FakeResult:
    def __init__(self, obj=None, rows=None):
        self.obj = obj
        self.rows = rows if rows is not None else (
            [obj] if obj is not None else []
        )

    def scalar_one_or_none(self):
        return self.obj

    def scalar_one(self):
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
    def __init__(self, deposit, user):
        self.deposit = deposit
        self.user = user
        self.commits = 0

    async def execute(self, stmt, params=None):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "system_config" in sql:
            return FakeResult(None)
        if "deposits" in sql:
            return FakeResult(self.deposit)
        if "users" in sql:
            return FakeResult(self.user)
        return FakeResult(None)

    def add(self, obj):
        return None

    async def commit(self):
        self.commits += 1

    async def refresh(self, obj):
        return None

    async def flush(self):
        return None


def _fixtures():
    user = User(
        id=7, email="dep@oxford.com", username="dep", full_name="Dep",
        main_wallet=Decimal("0"), deposit_wallet=Decimal("0"),
        account_status="active", parent_lvl_1_id=None,
        pending_package_id=None,
    )
    deposit = Deposit(
        id=1, user_id=7, amount=Decimal("100"), txid="txhash123",
        network_name="TRC20", status="pending",
    )
    return user, deposit


@pytest.fixture
def env(monkeypatch):
    user, deposit = _fixtures()
    sess = FakeSession(deposit, user)

    async def override_db():
        yield sess

    app.dependency_overrides[deps.get_current_admin_user] = lambda: SimpleNamespace(
        id=9, is_admin=True)
    app.dependency_overrides[deps.get_db] = override_db
    try:
        from app.core import database as core_db
        app.dependency_overrides[core_db.get_db] = override_db
    except Exception:
        pass

    async def _noop(**kwargs):
        return None

    async def _noop_eval(**kwargs):
        return {"rank_upgraded": False, "bonuses_paid": [],
                "previous_rank": None, "new_rank": None}

    class _Task:
        def delay(self, *a, **k):
            return None

    monkeypatch.setattr(dep_mod, "notify_admin", _noop)
    monkeypatch.setattr("app.services.rank_service.evaluate_and_process_rank",
                        _noop_eval)
    monkeypatch.setattr(dep_mod, "send_deposit_success_email_task", _Task())
    monkeypatch.setattr(dep_mod, "generate_deposit_invoice", _noop)

    try:
        app.state.limiter.enabled = False
    except Exception:
        pass

    from fastapi.testclient import TestClient

    client = TestClient(app)
    yield {"client": client, "sess": sess, "user": user, "deposit": deposit}
    app.dependency_overrides.clear()


def _patch(env, status):
    return env["client"].patch(
        "/api/v1/deposits/1", json={"status": status},
        headers={"Authorization": "Bearer test"})


def test_reject_returns_200_with_status(env):
    r = _patch(env, "rejected")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["data"]["deposit_id"] == 1
    assert body["data"]["status"] == "rejected"
    assert env["deposit"].status == "rejected"


def test_reject_is_idempotent_guarded(env):
    assert _patch(env, "rejected").status_code == 200
    r = _patch(env, "rejected")
    assert r.status_code == 400
    assert "already processed" in r.json()["detail"].lower()


def test_approve_returns_200_and_credits(env):
    r = _patch(env, "approved")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["data"]["deposit_id"] == 1
    assert body["data"]["status"] == "approved"
    assert env["deposit"].status == "approved"
    assert env["user"].deposit_wallet == Decimal("100")
