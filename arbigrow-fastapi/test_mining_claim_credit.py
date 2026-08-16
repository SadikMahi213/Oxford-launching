"""Regression tests: OFA mining claim reward must credit the OFA Token Wallet.

Issue: the mining claim flow credited the reward to `arbx_mining_wallet`
(the "ARBX Mining Wallet" / "OFA token Mining Wallet") while the frontend
"OFA Token Wallet" card reads `arbx_wallet`. Claiming therefore appeared to
succeed while the user's OFA Token Wallet balance never increased.

Fix: `claim_mining` credits `arbx_wallet` (OFA Token Wallet) in both the
normal and cycle-end paths, writes the OFA transaction with
target_wallet="arbx_wallet", and returns the updated arbx_wallet balance.

Run with: python test_mining_claim_credit.py
"""
import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from starlette.requests import Request

from app.api.v1.user import claim_mining


def _make_request() -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/user/claim-mining",
        "headers": [],
        "query_string": b"",
        "client": ("127.0.0.1", 1234),
        "scheme": "http",
        "server": ("testserver", 80),
        "root_path": "",
    }
    return Request(scope)
from app.models.mining_log import MiningLog
from app.models.ofa_coin_transaction import OFACoinTransaction, OFATransactionType
from app.models.user import User

TS = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)
MINING_CYCLE_SECONDS = 86400


def _now() -> datetime:
    return datetime.now(timezone.utc)


class _Row:
    def __init__(self, val):
        self.val = val

    def scalar_one_or_none(self):
        return self.val

    def scalars(self):
        class _S:
            def all(self):
                return [self.val] if self.val is not None else []

        return _S()


class _FakeMiningUser:
    def __init__(
        self,
        *,
        user_id=7,
        arbx_wallet=Decimal("100"),
        arbx_mining_wallet=Decimal("0"),
        daily_mined=Decimal("0"),
        mining_active=True,
        mining_started_at=None,
        last_mine_time=None,
        full_name="Test Miner",
    ):
        self.id = user_id
        self.user_no = f"U{user_id}"
        self.full_name = full_name
        self.arbx_wallet = arbx_wallet
        self.arbx_mining_wallet = arbx_mining_wallet
        self.daily_mined = daily_mined
        self.mining_active = mining_active
        self.mining_started_at = mining_started_at
        self.last_mine_time = last_mine_time
        self.account_status = "active"


class _FakeMiningDB:
    def __init__(self, user, *, existing_tx=None, cooldown="1"):
        self.user = user
        self.existing_tx = existing_tx
        self.cooldown = cooldown
        self.added = []
        self.commits = 0

    async def execute(self, stmt):
        text = str(stmt)
        if "ofa_coin_transactions" in text:
            return _Row(self.existing_tx)
        if "system_config" in text:
            cfg = type("_Cfg", (), {"value": self.cooldown})
            return _Row(cfg())
        if "users" in text:
            return _Row(self.user)
        return _Row(None)

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, OFACoinTransaction) and not getattr(obj, "id", None):
            obj.id = 2000 + len(self.added)
        if isinstance(obj, MiningLog) and not getattr(obj, "id", None):
            obj.id = 3000 + len(self.added)

    async def commit(self):
        self.commits += 1

    async def flush(self):
        return None

    async def refresh(self, obj, *_a, **_k):
        return None

    async def get(self, *_a, **_k):
        return None


def _run_claim(user, db, *, idempotency_key=None):
    async def run():
        with patch("app.api.v1.user.is_system_active", AsyncMock(return_value=True)), patch(
            "app.api.v1.user._is_mining_enabled", AsyncMock(return_value=True)
        ), patch("app.api.v1.user._get_mining_cap", AsyncMock(return_value=Decimal("20"))), patch(
            "app.api.v1.user.notify_admin", AsyncMock()
        ), patch("app.api.v1.user.check_earning_access", lambda u: None):
            return await claim_mining(
                request=_make_request(),
                current_user=user,
                db=db,
                idempotency_key=idempotency_key,
            )

    return asyncio.run(run())


def _normal_claim_user():
    start = _now() - timedelta(seconds=120)
    return _FakeMiningUser(
        arbx_wallet=Decimal("100"),
        mining_started_at=start,
        last_mine_time=start,
    )


def _added_ofa_txs(db):
    return [o for o in db.added if isinstance(o, OFACoinTransaction)]


def _added_mining_logs(db):
    return [o for o in db.added if isinstance(o, MiningLog)]


# ── Valid claim ───────────────────────────────────────────────────────────


def test_valid_claim_credits_arbx_wallet_not_mining_wallet():
    user = _normal_claim_user()
    db = _FakeMiningDB(user)
    resp = _run_claim(user, db)

    assert resp["message"] == "Mining reward claimed"
    reward = Decimal(str(resp["reward"]))
    assert reward > 0
    assert user.arbx_wallet == Decimal("100") + reward, "OFA Token Wallet must be credited"
    assert user.arbx_mining_wallet == Decimal("0"), "ARBX Mining Wallet must NOT be credited"
    assert resp["arbx_wallet"] == float(user.arbx_wallet)

    txs = _added_ofa_txs(db)
    assert len(txs) == 1
    tx = txs[0]
    assert tx.tx_type == OFATransactionType.mining_reward
    assert tx.amount == reward
    assert tx.target_wallet == "arbx_wallet"
    assert tx.wallet_balance_before == Decimal("100")
    assert tx.wallet_balance_after == user.arbx_wallet

    logs = _added_mining_logs(db)
    assert len(logs) == 1
    assert logs[0].amount == reward
    assert logs[0].user_id == user.id


def test_valid_claim_writes_single_transaction_and_log():
    user = _normal_claim_user()
    db = _FakeMiningDB(user)
    _run_claim(user, db)
    assert len(_added_ofa_txs(db)) == 1
    assert len(_added_mining_logs(db)) == 1
    assert db.commits >= 1


# ── Zero reward / cooldown guards ─────────────────────────────────────────


def test_zero_reward_rejected_no_credit():
    user = _FakeMiningUser(
        arbx_wallet=Decimal("100"),
        mining_started_at=_now() - timedelta(seconds=300),
        last_mine_time=_now(),
    )
    db = _FakeMiningDB(user, cooldown="0")
    try:
        _run_claim(user, db)
        assert False, "expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "No rewards" in exc.detail
    assert user.arbx_wallet == Decimal("100")
    assert len(_added_ofa_txs(db)) == 0
    assert len(_added_mining_logs(db)) == 0


def test_cooldown_not_elapsed_rejected_no_credit():
    user = _FakeMiningUser(
        arbx_wallet=Decimal("100"),
        mining_started_at=_now() - timedelta(seconds=30),
        last_mine_time=_now() - timedelta(seconds=10),
    )
    db = _FakeMiningDB(user, cooldown="1")
    try:
        _run_claim(user, db)
        assert False, "expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "Wait at least" in exc.detail
    assert user.arbx_wallet == Decimal("100")
    assert len(_added_ofa_txs(db)) == 0


def test_no_active_session_rejected():
    user = _FakeMiningUser(mining_active=False, mining_started_at=None, last_mine_time=None)
    db = _FakeMiningDB(user)
    try:
        _run_claim(user, db)
        assert False, "expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "No active mining session" in exc.detail
    assert user.arbx_wallet == Decimal("100")


# ── Duplicate / double-click protection ───────────────────────────────────


def test_idempotency_key_blocks_duplicate_claim():
    user = _normal_claim_user()
    existing = OFACoinTransaction(
        id=1, user_id=user.id, tx_type=OFATransactionType.mining_reward,
        amount=Decimal("1"), wallet_balance_before=Decimal("100"),
        wallet_balance_after=Decimal("101"), target_wallet="arbx_wallet",
        idempotency_key="dup-key",
    )
    db = _FakeMiningDB(user, existing_tx=existing)
    try:
        _run_claim(user, db, idempotency_key="dup-key")
        assert False, "expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 409
        assert "already been processed" in exc.detail
    assert user.arbx_wallet == Decimal("100")
    assert len(_added_ofa_txs(db)) == 0


def test_sequential_double_click_does_not_double_credit():
    user = _normal_claim_user()
    db = _FakeMiningDB(user)
    first = _run_claim(user, db)
    reward = Decimal(str(first["reward"]))
    balance_after_first = user.arbx_wallet
    assert balance_after_first == Decimal("100") + reward

    # A second claim in the same cooldown window must be rejected.
    try:
        _run_claim(user, db)
        assert False, "expected HTTPException"
    except HTTPException as exc:
        assert exc.status_code == 400
    assert user.arbx_wallet == balance_after_first, "balance must not increase twice"


# ── Cycle-end path ────────────────────────────────────────────────────────


def test_cycle_end_claim_credits_arbx_wallet():
    start = TS - timedelta(seconds=MINING_CYCLE_SECONDS + 60)
    user = _FakeMiningUser(
        arbx_wallet=Decimal("100"),
        mining_started_at=start,
        last_mine_time=start,
    )
    db = _FakeMiningDB(user)
    resp = _run_claim(user, db)

    assert resp["message"] == "Mining cycle ended. Start a new mining session."
    reward = Decimal(str(resp["reward"]))
    assert reward > 0
    assert user.arbx_wallet == Decimal("100") + reward
    assert user.arbx_mining_wallet == Decimal("0")
    assert resp["arbx_wallet"] == float(user.arbx_wallet)
    assert user.mining_active is False

    txs = _added_ofa_txs(db)
    assert len(txs) == 1
    assert txs[0].target_wallet == "arbx_wallet"
    assert txs[0].tx_type == OFATransactionType.mining_reward


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} MINING CLAIM CREDIT TESTS PASSED")
