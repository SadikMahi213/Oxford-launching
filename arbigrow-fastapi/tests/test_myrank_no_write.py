"""GET /ranks/my-rank must not write on read; figures must stay identical.

Covers the Phase 2 item: the endpoint previously persisted
``current_user.team_volume`` + COMMIT on every KYC-approved read, even though
the column is authoritatively maintained by deposit-approval rank evaluation
and the response is computed from a freshly calculated value.

FakeSession routes compiled SQL to in-memory fixtures and counts commits, so
a write-on-read is directly observable. No real database is touched.
"""
import re
from decimal import Decimal

import pytest

from app.api.v1 import deps
from app.main import app
from app.models.deposit import Deposit
from app.models.rank import Rank
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

    def unique(self):
        return self

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None

    def fetchall(self):
        return self.rows

    def __iter__(self):
        return iter(self.rows)


class FakeSession:
    def __init__(self):
        self.configs = {}
        self.deposits = []          # (user_id, amount, status)
        self.descendants = {}       # uid -> [ids]
        self.ranks = []
        self.commits = 0
        self.team_volume_hint = Decimal("160")

    async def execute(self, stmt, params=None):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "team_tree" in sql:
            uid = (params or {}).get("uid")
            ids = self.descendants.get(uid, [])
            return FakeResult(None, [(i,) for i in ids])
        if "matching_bonuses" in sql:
            return FakeResult(Decimal("0"), [Decimal("0")])
        if "deposits" in sql:
            m = re.search(r"IN \(([\d,\s]+)\)", sql)
            if m:
                ids = {int(x) for x in m.group(1).split(",")}
                total = sum(a for u, a, s in self.deposits
                            if u in ids and s == "approved")
            else:
                m = re.search(r"user_id = (\d+)", sql)
                uid = int(m.group(1)) if m else None
                total = sum(a for u, a, s in self.deposits
                            if u == uid and s == "approved")
            return FakeResult(Decimal(str(total)), [Decimal(str(total))])
        if "FROM ranks" in sql or "ranks" in sql and "id = " not in sql:
            rows = [r for r in self.ranks if r.is_active]
            m = re.search(r"target_volume <= ([\d.]+)", sql)
            if m:
                vol = Decimal(m.group(1))
                rows = [r for r in rows if Decimal(str(r.target_volume)) <= vol]
                rows.sort(key=lambda r: -r.sort_order)
                return FakeResult(rows[0] if rows else None, rows)
            if "target_volume >" in sql:
                m = re.search(r"target_volume > ([\d.]+)", sql)
                if m:
                    vol = Decimal(m.group(1))
                else:
                    # CAST(:param) renders without a literal; the test sets the
                    # hint to the team volume under test (double-only concern).
                    vol = Decimal(str(self.team_volume_hint))
                rows = [r for r in rows if Decimal(str(r.target_volume)) > vol]
                rows.sort(key=lambda r: r.sort_order)
                return FakeResult(rows[0] if rows else None, rows)
            return FakeResult(rows[0] if rows else None, rows)
        if "FROM users" in sql or "users" in sql and "kyc" in sql.lower():
            return FakeResult(None)
        if "sellers" in sql.lower() or "kyc" in sql.lower():
            return FakeResult(None, [])
        return FakeResult(None)

    async def get(self, model, ident):
        return None

    def add(self, obj):
        return None

    async def commit(self):
        self.commits += 1

    async def close(self):
        return None

    async def refresh(self, obj):
        return None

    async def flush(self):
        return None


def _rank(rid, name, target, sort):
    return Rank(
        id=rid, name=name, slug=name.lower(), target_volume=Decimal(str(target)),
        max_matching_percent=Decimal("5"), is_active=True, description=None,
        sort_order=sort, bonus_configs=[], created_at=None, updated_at=None,
    )


def _user(uid, email, team_volume):
    return User(
        id=uid, email=email, username=email.split("@")[0], full_name="T User",
        user_no="00000001", referral_code="00000001", is_admin=False,
        main_wallet=Decimal("0"), deposit_wallet=Decimal("0"),
        withdraw_wallet=Decimal("0"), referral_wallet=Decimal("0"),
        generation_wallet=Decimal("0"), arbx_wallet=Decimal("0"),
        arbx_mining_wallet=Decimal("0"), captcha_wallet=Decimal("0"),
        ad_view_wallet=Decimal("0"), ecommerce_wallet=Decimal("0"),
        matching_bonus_wallet=Decimal("0"), kyc_hold=Decimal("0"),
        email_verified=True, account_status="active",
        team_volume=team_volume, current_rank_id=None,
        kyc_approved_team_volume=None, parent_lvl_1_id=None,
    )


@pytest.fixture
def env(monkeypatch):
    sess = FakeSession()
    sess.ranks = [_rank(1, "R1", 0, 1), _rank(2, "R2", 100, 2), _rank(3, "R3", 500, 3)]
    sess.deposits = [(1, Decimal("60"), "approved"),
                     (2, Decimal("100"), "approved"),
                     (2, Decimal("999"), "pending")]
    sess.descendants = {1: [2]}
    parent = _user(1, "parent@oxford.com", Decimal("5"))  # stale cached volume
    box = {"user": parent}

    async def _kyc_yes(*a, **k):
        return True

    async def _kyc_no(*a, **k):
        return False

    # Patch BOTH binding sites: ranks.py imports is_kyc_approved lazily
    # inside the endpoint (sees the source attr), while rank_service.py binds
    # it at module import (must be patched where used, else test outcome
    # depends on which test module imported rank_service first).
    monkeypatch.setattr("app.utils.kyc_helper.is_kyc_approved", _kyc_yes)
    monkeypatch.setattr("app.services.rank_service.is_kyc_approved", _kyc_yes)

    async def override_db():
        yield sess

    app.dependency_overrides[deps.get_current_user] = lambda: box["user"]
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
    yield {"client": client, "sess": sess, "box": box, "parent": parent}
    app.dependency_overrides.clear()


def _my_rank(env):
    return env["client"].get(
        "/api/v1/ranks/my-rank", headers={"Authorization": "Bearer test"})


# ── Response figures (must hold before AND after the optimization) ──
def test_myrank_figures(env):
    r = _my_rank(env)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user_no"] == "00000001"
    assert body["personal_volume"] == "60"
    assert body["team_volume"] == "160.00000000000000"
    assert body["network_volume"] == "100.00000000000000"
    assert body["current_rank"]["name"] == "R2"
    assert body["next_rank"]["name"] == "R3"
    assert body["remaining_volume"] == "340.00000000000000"
    assert body["next_target_volume"] == "500"
    assert body["progress"] == pytest.approx(32.0)
    assert body["total_matching_bonus_earned"] == "0"
    assert body["kyc_approved_team_volume"] is None
    assert "kyc_required" not in body


def test_myrank_kyc_gated_shape(env, monkeypatch):
    async def _kyc_no(*a, **k):
        return False

    monkeypatch.setattr("app.utils.kyc_helper.is_kyc_approved", _kyc_no)
    monkeypatch.setattr("app.services.rank_service.is_kyc_approved", _kyc_no)
    r = _my_rank(env)
    assert r.status_code == 200
    body = r.json()
    assert body["current_rank"] is None
    assert body["next_rank"] is None
    assert body["kyc_required"] is True
    assert body["team_volume"] == "160.00000000000000"
    assert env["sess"].commits == 0


# ── Write-on-read (fails on old code, passes after fix) ─────────────
def test_myrank_performs_no_write(env):
    before = env["parent"].team_volume
    assert before == Decimal("5")  # stale sentinel
    r = _my_rank(env)
    assert r.status_code == 200
    assert r.json()["team_volume"] == "160.00000000000000"  # fresh value served
    assert env["parent"].team_volume == Decimal("5")  # stored value untouched
    assert env["sess"].commits == 0  # no COMMIT during a GET


# ── /me keeps exact figures; skips redundant persist when unchanged ──
def test_me_skips_write_when_volume_unchanged(env):
    newcomer = _user(3, "new@oxford.com", Decimal("0"))
    env["box"]["user"] = newcomer
    r = env["client"].get(
        "/api/v1/user/me", headers={"Authorization": "Bearer test"})
    assert r.status_code == 200, r.text
    assert Decimal(str(r.json()["user"]["team_volume"])) == 0
    assert env["sess"].commits == 0
    assert newcomer.team_volume == Decimal("0")


def test_me_still_persists_when_volume_changed(env):
    earner = _user(1, "parent@oxford.com", Decimal("0"))
    env["box"]["user"] = earner
    r = env["client"].get(
        "/api/v1/user/me", headers={"Authorization": "Bearer test"})
    assert r.status_code == 200, r.text
    assert Decimal(str(r.json()["user"]["team_volume"])) == Decimal("160")
    assert earner.team_volume == Decimal("160.00000000000000")
    assert env["sess"].commits == 1
