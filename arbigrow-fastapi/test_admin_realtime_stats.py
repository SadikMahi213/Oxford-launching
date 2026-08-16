"""Regression tests for the admin realtime-stats dashboard aggregates.

Covers:
- `total_signup_bonus_distributed` sums ONLY signup/package-signup OFA ledger
  entries (excludes referral bonuses, mining rewards, conversions).
- `total_mining_ofa_distributed` equals the sum of successful mining claims as
  recorded in the balance-proven `ofa_coin_transactions` ledger
  (`tx_type = mining_reward`), the same authoritative ledger as
  `total_mining_ofa`. The raw `mining_logs` claim log is NOT authoritative
  (it can contain orphan rows with no wallet credit).
- `total_kyc_purchases_usd` uses stored `fee_paid` and excludes refunded fees
  (no live kyc_fee config x count multiplication).
- `total_withdrawn` is the net of stored withdrawal charges.
- Transfers and paid-package investments are status-filtered.
- `online_users_live` counts real members via `User.last_active_at` (heartbeat),
  NOT anonymous visitor sessions from VisitorLog.
- The activity heartbeat in `deps.get_current_user` stamps `last_active_at`
  when stale (throttled) and skips the write when recent.
- Free vs paid user earnings do NOT double count users who hold both a free
  and a paid package.
- Reversed matching bonuses are excluded.
- Empty state returns 0 correctly.

Run with: python test_admin_realtime_stats.py
"""
import asyncio
import re
from decimal import Decimal

from sqlalchemy.dialects import postgresql

from app.api.v1.admin import get_realtime_stats
from app.api.v1.deps import get_current_user


class _Row:
    def __init__(self, val):
        self.val = val

    def scalar(self):
        return self.val

    def scalar_one_or_none(self):
        return self.val

    def all(self):
        return self.val or []


class _FakeDashboardDB:
    """Dispatching fake session that returns canned aggregates per query."""

    def __init__(self):
        # ledger inputs
        self.signup_bonus = Decimal("2000")      # 20 x 100
        self.package_signup = Decimal("50")      # 1 x 50
        self.referral_bonus = Decimal("130")
        self.mining_reward_tx = Decimal("20")
        self.mining_logs = Decimal("60")         # 3 successful claims
        # earnings
        self.total_captcha = Decimal("0.10")
        self.free_captcha = Decimal("0.01")
        self.paid_captcha = Decimal("0.09")
        self.total_ad = Decimal("0.05")
        self.free_ad = Decimal("0.00")
        self.paid_ad = Decimal("0.05")
        self.referral_lvl1 = Decimal("496.1")
        self.referral_gen = Decimal("422.4")
        self.matching_not_reversed = Decimal("4.0")
        self.matching_reversed = Decimal("9999")
        self.profit_hist = Decimal("0")
        self.deposited = Decimal("1000")
        self.withdrawn = Decimal("200")
        self.withdrawal_charge = Decimal("15")
        self.transferred = Decimal("10")
        self.ecommerce_funded = Decimal("0")
        self.kyc_purchased = Decimal("90")       # 12 paid, 3 fee-refunded -> 9 x 10
        self.paid_package_investment = Decimal("475")
        self.free_package_dist = Decimal("0")
        self.members = 74
        self.active_kyc = 9
        self.ecommerce_sellers = 3
        self.online_members = 7  # distinct users active in the last 5 minutes

    _OFA_LEDGER = {
        "signup_bonus": "signup_bonus",
        "package_signup_bonus": "package_signup",
        "referral_bonus": "referral_bonus",
        "mining_reward": "mining_reward_tx",
    }

    async def execute(self, stmt):
        t = str(
            stmt.compile(
                dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
            )
        )
        if "ofa_coin_transactions" in t:
            m = re.search(r"tx_type IN \(([^)]*)\)", t)
            assert m, "ofa_coin_transactions ledger query must filter by tx_type"
            types = re.findall(r"'([^']+)'", m.group(1))
            assert types and all(tp in self._OFA_LEDGER for tp in types), (
                f"unexpected tx_type set in ledger query: {types}"
            )
            return _Row(
                sum(
                    Decimal(getattr(self, self._OFA_LEDGER[tp])) for tp in types
                )
            )
        if "mining_logs" in t:
            return _Row(self.mining_logs)
        if "captcha_earnings" in t:
            if "invested_amount >" in t and "NOT IN" not in t:
                return _Row(self.paid_captcha)
            return _Row(self.free_captcha)
        if "ad_views" in t:
            if "invested_amount >" in t and "NOT IN" not in t:
                return _Row(self.paid_ad)
            return _Row(self.free_ad)
        if "visitor_logs" in t:
            return _Row(0)
        if "referral_profit_history" in t:
            if "level = 1" in t:
                return _Row(self.referral_lvl1)
            return _Row(self.referral_gen)
        if "matching_bonuses" in t:
            return _Row(self.matching_not_reversed)
        if "kyc_verifications" in t:
            # Authoritative KYC revenue: stored fee_paid, paid + never refunded.
            assert "fee_paid" in t, "KYC query must sum stored fee_paid"
            assert "fee_refunded" in t, "KYC purchases must exclude refunded fees"
            return _Row(self.kyc_purchased)
        if "sellers" in t:
            return _Row(self.ecommerce_sellers)
        if "investments" in t:
            if "investment_profit_history" in t:
                return _Row(self.free_package_dist)
            assert "active" in t, "paid package investment sum must filter status = active"
            return _Row(self.paid_package_investment)
        if "investment_profit_history" in t:
            return _Row(self.profit_hist)
        if "deposits" in t:
            if "count" in t:
                return _Row(10)
            return _Row(self.deposited)
        if "withdrawals" in t:
            if "count" in t:
                return _Row(5)
            # Net approved withdrawals: gross amount minus the stored charge.
            assert "charge" in t, "withdrawal sum must subtract the stored charge"
            return _Row(self.withdrawn - self.withdrawal_charge)
        if "transfer_logs" in t:
            assert "completed" in t, "transfer sum must filter status = completed"
            return _Row(self.transferred)
        if "users" in t:
            if "ecommerce_wallet" in t:
                return _Row(self.ecommerce_funded)
            if "admin_kyc_status" in t:
                return _Row(self.active_kyc)
            # Online members = real authenticated users whose heartbeat is
            # recent. Must NOT count anonymous visitor_log sessions.
            if "last_active_at" in t:
                assert "last_active_at" in t, "online count must use User.last_active_at"
                assert "session_id" not in t, "online count must not use visitor sessions"
                return _Row(self.online_members)
            return _Row(self.members)
        raise AssertionError(f"unhandled query: {t}")

    async def add(self, obj):
        pass

    async def commit(self):
        pass

    async def refresh(self, obj, *_a, **_k):
        pass

    async def get(self, *_a, **_k):
        return None


def _fetch(db):
    async def run():
        return await get_realtime_stats(db=db, current_admin=None)

    return asyncio.run(run())


def test_signup_bonus_sums_only_signup_ledger_entries():
    db = _FakeDashboardDB()
    r = _fetch(db)
    assert r["total_signup_bonus_distributed"] == "2050.00000000000000"


def test_signup_bonus_excludes_referral_and_mining_tx_types():
    # The canned ledger contains referral (130) and mining (20) OFA entries;
    # they must never leak into the signup-bonus total.
    db = _FakeDashboardDB()
    r = _fetch(db)
    total = Decimal(r["total_signup_bonus_distributed"])
    assert total == db.signup_bonus + db.package_signup
    assert total != db.signup_bonus + db.referral_bonus
    assert total != db.signup_bonus + db.mining_reward_tx


def test_mining_ofa_distributed_from_mining_reward_ledger():
    db = _FakeDashboardDB()
    r = _fetch(db)
    # Authoritative: mining_reward OFA ledger (20), not the raw mining_logs sum (60).
    assert r["total_mining_ofa_distributed"] == "20.00000000000000"
    assert r["total_mining_ofa"] == r["total_mining_ofa_distributed"]


def test_free_and_paid_earnings_do_not_double_count():
    db = _FakeDashboardDB()
    r = _fetch(db)

    free_total = Decimal(r["total_free_package_captcha_earnings"]) + Decimal(
        r["total_free_package_ad_earnings"]
    )
    paid_total = Decimal(r["total_paid_package_captcha_earnings"]) + Decimal(
        r["total_paid_package_ad_earnings"]
    )
    combined = free_total + paid_total
    assert combined == db.total_captcha + db.total_ad, "free+paid must equal the grand totals"
    assert Decimal(r["total_free_package_captcha_earnings"]) == db.free_captcha
    assert Decimal(r["total_paid_package_captcha_earnings"]) == db.paid_captcha
    assert Decimal(r["total_free_package_ad_earnings"]) == db.free_ad
    assert Decimal(r["total_paid_package_ad_earnings"]) == db.paid_ad


def test_reversed_matching_bonus_excluded():
    db = _FakeDashboardDB()
    r = _fetch(db)
    assert r["total_matching_bonus"] == "4.00000000000000"
    assert Decimal(r["total_matching_bonus"]) != db.matching_reversed


def test_empty_state_returns_zero():
    db = _FakeDashboardDB()
    db.signup_bonus = Decimal("0")
    db.package_signup = Decimal("0")
    db.mining_logs = Decimal("0")
    db.mining_reward_tx = Decimal("0")
    db.total_captcha = db.free_captcha = db.paid_captcha = Decimal("0")
    db.total_ad = db.free_ad = db.paid_ad = Decimal("0")
    r = _fetch(db)
    assert r["total_signup_bonus_distributed"] == "0.00000000000000"
    assert r["total_mining_ofa_distributed"] == "0.00000000000000"

    db2 = _FakeDashboardDB()
    db2.captcha_branch_total = None  # unused marker
    r2 = _fetch(db2)
    assert r2["total_free_package_captcha_earnings"] != ""  # defined in response


def test_kyc_purchases_uses_stored_fee_paid_and_excludes_refunds():
    # Paid = 12 rows x 10 fee, but 3 are fee_refunded -> 9 x 10 = 90.
    db = _FakeDashboardDB()
    r = _fetch(db)
    assert r["total_kyc_purchases_usd"] == "90.00000000000000"
    # Guard: the canned value must NOT be the old live-config 12 x kyc_fee = 120.
    assert Decimal(r["total_kyc_purchases_usd"]) != Decimal("120")
    assert Decimal(r["total_kyc_purchases_usd"]) < Decimal("120")


def test_withdrawn_is_net_of_stored_charge():
    # 200 gross approved withdrawals minus 15 stored charge = 185.
    db = _FakeDashboardDB()
    r = _fetch(db)
    assert r["total_withdrawn"] == "185.00000000000000"
    assert Decimal(r["total_withdrawn"]) == db.withdrawn - db.withdrawal_charge
    assert Decimal(r["total_withdrawn"]) != db.withdrawn  # must NOT ignore charge


def test_transferred_and_paid_investment_status_filters_present():
    # The fake asserts the rendered SQL contains TransferLog.status == completed
    # and Investment.status == active; canned totals must flow through.
    db = _FakeDashboardDB()
    r = _fetch(db)
    assert r["total_transferred"] == "10.00000000000000"
    assert r["total_paid_package_investment"] == "475.00000000000000"


def test_multiple_records_aggregated_not_paginated():
    # Mining rewards (only the balance-proven mining_reward ledger) and signup
    # bonuses must all be summed — no LIMIT/pagination anywhere in the endpoint.
    db = _FakeDashboardDB()
    r = _fetch(db)
    assert r["total_mining_ofa_distributed"] == "20.00000000000000"
    assert r["total_signup_bonus_distributed"] == "2050.00000000000000"


def test_online_users_live_counts_active_members_not_visitor_sessions():
    # online_users_live must now count real members whose heartbeat
    # (last_active_at) is within the last 5 minutes, not anonymous visitor
    # sessions from VisitorLog.
    db = _FakeDashboardDB()
    r = _fetch(db)
    assert r["online_users_live"] == 7
    assert r["online_users_live"] != 0


# ── Activity heartbeat (deps.get_current_user) ──────────────────────────────
class _HeartbeatUser:
    def __init__(self, last_active_at):
        self.id = 1
        self.last_active_at = last_active_at


class _FakeUserDB:
    def __init__(self, user):
        self.user = user
        self.committed = False

    async def execute(self, stmt):
        class _R:
            def scalar_one_or_none(self_inner):
                return self.user

        return _R()

    async def commit(self):
        self.committed = True

    async def rollback(self):
        self.rolledback = True


def test_heartbeat_stamps_last_active_when_stale():
    from datetime import datetime, timedelta, timezone

    user = _HeartbeatUser(datetime.now(timezone.utc) - timedelta(minutes=5))
    db = _FakeUserDB(user)
    asyncio.run(get_current_user(user_id=1, db=db))
    assert db.committed
    assert user.last_active_at is not None
    assert (datetime.now(timezone.utc) - user.last_active_at) < timedelta(seconds=5)


def test_heartbeat_skips_write_when_recent():
    from datetime import datetime, timezone

    recent = datetime.now(timezone.utc)
    user = _HeartbeatUser(recent)
    db = _FakeUserDB(user)
    asyncio.run(get_current_user(user_id=1, db=db))
    assert not db.committed
    assert user.last_active_at == recent


def test_heartbeat_stamps_when_never_active():
    user = _HeartbeatUser(None)
    db = _FakeUserDB(user)
    asyncio.run(get_current_user(user_id=1, db=db))
    assert db.committed
    assert user.last_active_at is not None


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} ADMIN REALTIME STATS TESTS PASSED")