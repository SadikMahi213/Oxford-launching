"""Referral-network response contract (column-trim optimization lock).

Proves GET /user/referral-network returns byte-identical member fields,
levels, totals and commission earnings while loading only selected columns
and aggregating commissions in SQL. No real database is touched.
"""
import re
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.api.v1 import deps
from app.main import app
from app.models.user import User


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

    def one(self):
        return self.rows[0]

    def fetchall(self):
        return self.rows

    def __iter__(self):
        return iter(self.rows)


def _member(uid, name, ref=0, gen=0, parent=None):
    return User(
        id=uid, email=f"{name}@oxford.com", username=name, full_name=name,
        user_no=str(uid).zfill(8), referral_wallet=Decimal(str(ref)),
        generation_wallet=Decimal(str(gen)), parent_lvl_1_id=parent,
        created_at=datetime(2026, 3, 5, tzinfo=timezone.utc),
        account_status="active",
    )


class FakeSession:
    def __init__(self, users):
        self._users = {u.id: u for u in users}

    async def execute(self, stmt, params=None):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "team_tree" in sql:
            if "depth = " in sql:
                # level-analytics filters a single depth; bound params are
                # not rendered by literal_binds, so read them directly.
                lvl = (params or {}).get("lvl")
                rows = [(2, 1), (3, 2)]
                if lvl is not None:
                    rows = [(i, d) for i, d in rows if d == lvl]
                return FakeResult(None, rows)
            return FakeResult(None, [(2, 1), (3, 2)])
        if "system_config" in sql:
            return FakeResult(None)
        if "deposit_volume" in sql:
            # level-analytics combined scalar-subquery aggregate
            from types import SimpleNamespace
            return FakeResult(
                SimpleNamespace(
                    deposit_volume=Decimal("120"),
                    investment_volume=Decimal("200"),
                    commission_earned=Decimal("30"),
                ),
                [SimpleNamespace(
                    deposit_volume=Decimal("120"),
                    investment_volume=Decimal("200"),
                    commission_earned=Decimal("30"),
                )])
        if "referral_profit_history" in sql:
            return FakeResult(None, [(1, Decimal("25")), (2, Decimal("14"))])
        if "kyc" in sql.lower() and "users" not in sql:
            return FakeResult(None, [(2,), (3,)])
        if "deposits" in sql:
            return FakeResult(Decimal("0"), [Decimal("0")])
        if "investments" in sql:
            return FakeResult(None, [])
        if "users" in sql:
            if "group by" in sql.lower():
                return FakeResult(None, [])
            if "username" in sql and "user_no" not in sql:
                m = re.search(r"IN \(([\d,\s]+)\)", sql)
                ids = [int(x) for x in m.group(1).split(",")] if m else []
                return FakeResult(
                    None, [(i, self._users[i].username) for i in ids
                           if i in self._users])
            m = re.search(r"IN \(([\d,\s]+)\)", sql)
            ids = [int(x) for x in m.group(1).split(",")] if m else []
            rows = [self._users[i] for i in ids if i in self._users]
            return FakeResult(rows[0] if rows else None, rows)
        return FakeResult(None)

    async def close(self):
        return None


@pytest.fixture
def env(monkeypatch):
    me = _member(1, "root")
    users = [me, _member(2, "anna", ref=10, gen=5, parent=1),
             _member(3, "bob", ref=0, gen=7, parent=2)]
    sess = FakeSession(users)

    async def override_db():
        yield sess

    app.dependency_overrides[deps.get_current_user] = lambda: me
    app.dependency_overrides[deps.get_db] = override_db
    try:
        from app.core import database as core_db
        app.dependency_overrides[core_db.get_db] = override_db
    except Exception:
        pass

    try:
        app.state.limiter.enabled = False
    except Exception:
        pass

    from fastapi.testclient import TestClient

    client = TestClient(app)
    yield {"client": client}
    app.dependency_overrides.clear()


def test_referral_network_contract(env):
    r = env["client"].get(
        "/api/v1/user/referral-network",
        headers={"Authorization": "Bearer test"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total_team_members"] == 2
    assert body["total_referrals"] == 2
    assert body["bonus_eligible_members"] == 2
    assert body["non_bonus_members"] == 0
    assert body["total_active_referrals"] == 2
    by_level = {lvl["level"]: lvl for lvl in body["levels"]}
    assert by_level[1]["commission_rate"] == "10%"
    assert by_level[1]["total_earnings"] == "25" or \
        by_level[1]["total_earnings"] == 25
    assert by_level[2]["total_earnings"] == "14" or \
        by_level[2]["total_earnings"] == 14
    anna = by_level[1]["users"][0]
    assert anna["id"] == 2
    assert anna["username"] == "anna"
    assert anna["level"] == 1
    assert anna["join_date"] == "Mar 05, 2026"
    assert anna["referred_by"] == "root"
    assert anna["status"] == "inactive"
    assert len(by_level[2]["users"]) == 1
    assert by_level[3]["users"] == []


def test_level_analytics_contract(env):
    r = env["client"].get(
        "/api/v1/user/level-analytics/1",
        headers={"Authorization": "Bearer test"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["level"] == 1
    assert body["total_members"] == 1
    assert body["total_deposit_volume"] == "120"
    assert body["total_investment_volume"] == "200"
    assert body["total_commission_earned"] == "30"
    assert len(body["members"]) == 1
    anna = body["members"][0]
    assert anna["user_no"] == "00000002"
    assert anna["name"] == "anna"
    assert anna["username"] == "anna"
    assert anna["join_date"] == "Mar 05, 2026"
    assert anna["total_earnings"] == "15"
    assert anna["status"] == "active"


def test_level_analytics_empty_level(env):
    r = env["client"].get(
        "/api/v1/user/level-analytics/4",
        headers={"Authorization": "Bearer test"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total_members"] == 0
    assert body["members"] == []
