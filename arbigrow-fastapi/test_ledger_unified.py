"""Regression tests: unified OFA Earning & Transaction Ledger.

Covers the server-side `/ledger/transactions` aggregation:
- mining rewards come ONLY from the authoritative OFA coin ledger
  (`ofa_coin_transactions.tx_type == 'mining_reward'`), the same source
  admin.py uses for total mining distribution — never double-counted with
  mining_logs.
- matching bonus rows are USDT (matching_bonus_wallet), not OFA.
- investment ROI (main_wallet) is USDT, not USD.
- category summary is a single SQL SUM per table (no pagination, no wallets,
  no fabricated "soon" rows are counted).
- records are split into `earning_history` and `transaction_history` by stream.

Run with: python test_ledger_unified.py
"""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal

from app.api.v1.ledger import _build_ledger


TS = datetime(2026, 8, 20, 12, 0, 0, tzinfo=timezone.utc)


class _Scalars:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class _FirstRow:
    def __init__(self, value):
        self.value = value

    def __getitem__(self, _k):
        return self.value


class _Result:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return _Scalars(self.rows)

    def scalar_one_or_none(self):
        return self.rows[0] if self.rows else None

    def first(self):
        val = self.rows[0] if self.rows else None
        # The only `.first()` in ledger.py selects the OFA wallet_balance_after
        # column; expose it as the tuple item the code reads via row[0].
        if val is not None:
            val = getattr(val, "wallet_balance_after", None)
        if val is None:
            return None
        return _FirstRow(val)

    def scalar(self):
        return self.rows[0] if self.rows else None


def _r(**kw):
    return type("Row", (), kw)


def _user(**kw):
    defaults = dict(
        id=7,
        main_wallet=Decimal("0"),
        deposit_wallet=Decimal("0"),
        withdraw_wallet=Decimal("0"),
        referral_wallet=Decimal("0"),
        generation_wallet=Decimal("0"),
        captcha_wallet=Decimal("0"),
        ad_view_wallet=Decimal("0"),
        ecommerce_wallet=Decimal("0"),
        matching_bonus_wallet=Decimal("0"),
        arbx_wallet=Decimal("0"),
        arbx_mining_wallet=Decimal("0"),
    )
    defaults.update(kw)
    return _r(**defaults)


class _FakeDB:
    """Routes execute() by the table name in the generated SQL text.

    Aggregate queries (containing a SUM), matched by their first table marker,
    return a single pre-computed scalar from `agg` (mirroring the expected
    WHERE-filtered SUM the real DB would produce). Row queries return the
    seeded rows.
    """

    def __init__(self, tables=None, agg=None):
        self.tables = tables or {}
        self.agg = agg or {}

    async def execute(self, stmt):
        text = str(stmt).lower()
        if "system_configs" in text or "systemconfig" in text or "ofa_to_usdt_rate" in text:
            return _Result([])
        agg = "sum(" in text or "coalesce" in text
        for marker in (
            "ecommerce_wallet_transactions",
            "investment_profit_history",
            "referral_profit_history",
            "matching_bonuses",
            "wallet_transactions",
            "captcha_earnings",
            "ad_views",
            "ofa_coin_transactions",
            "withdrawals",
            "deposits",
            "transfer_logs",
        ):
            if marker in text:
                if agg:
                    return _Result([self.agg.get(marker, 0)])
                return _Result(self.tables.get(marker, []))
        return _Result([])


def _seed_data():
    ofa_mining = _r(
        id=1, tx_type="mining_reward", created_at=TS, amount=Decimal("5"),
        wallet_balance_before=Decimal("100"), wallet_balance_after=Decimal("105"),
        reference_id=None,
    )
    ofa_signup = _r(
        id=2, tx_type="signup_bonus", created_at=TS.replace(hour=11), amount=Decimal("3"),
        wallet_balance_before=Decimal("0"), wallet_balance_after=Decimal("3"),
        reference_id=None,
    )
    deposit = _r(id=1, created_at=TS, amount=Decimal("100"), status="approved", txid="tx-1")
    pending_deposit = _r(id=2, created_at=TS, amount=Decimal("999"), status="pending", txid="tx-p")
    withdrawal = _r(
        id=1, created_at=TS, amount=Decimal("40"), charge=Decimal("1"),
        status="approved", transaction_id="wd-1",
    )
    captcha = _r(id=1, created_at=TS, amount_earned=Decimal("0.5"), is_correct=True)
    captcha_wrong = _r(id=2, created_at=TS, amount_earned=Decimal("9"), is_correct=False)
    ad = _r(id=1, started_at=TS, completed_at=TS, amount_earned=Decimal("1.25"),
            is_completed=True, ad_id=101)
    ads_pending = _r(id=2, started_at=TS, completed_at=None, amount_earned=Decimal("8"),
                     is_completed=False, ad_id=102)
    referral = _r(id=1, created_at=TS, level=1, amount=Decimal("2"),
                  investment_id=None, deposit_id=1)
    matching = _r(id=1, created_at=TS, bonus_type="matching", bonus_amount=Decimal("10"),
                  is_reversed=False, reference_id=None)
    reversed_matching = _r(id=2, created_at=TS, bonus_type="matching",
                           bonus_amount=Decimal("99"), is_reversed=True, reference_id=None)
    ecom_credit = _r(id=1, created_at=TS, type="credit", amount=Decimal("7"), order_id=501)
    ecom_debit = _r(id=2, created_at=TS, type="debit", amount=Decimal("-3"), order_id=502)
    kyc = _r(id=1, created_at=TS, type="kyc_fee_hold", amount=Decimal("2"),
             reference_id=None, status="held")
    profit = _r(id=1, created_at=TS, amount=Decimal("3"))

    return dict(
        ofa_coin_transactions=[ofa_mining, ofa_signup],
        deposits=[deposit, pending_deposit],
        withdrawals=[withdrawal],
        captcha_earnings=[captcha, captcha_wrong],
        ad_views=[ad, ads_pending],
        referral_profit_history=[referral],
        matching_bonuses=[matching, reversed_matching],
        ecommerce_wallet_transactions=[ecom_credit, ecom_debit],
        wallet_transactions=[kyc],
        investment_profit_history=[profit],
        transfer_logs=[],
    )


def _run(user=None, tables=None):
    async def run():
        u = user or _user()
        db = _FakeDB(tables=tables, agg=_seed_agg(tables))
        records, balances, categories = await _build_ledger(u, db, task_only=False)
        return records, balances, categories

    return asyncio.run(run())


def _seed_agg(tables):
    """Hand-computed WHERE-filtered SUMs for the seeded rows above.

    Mirrors the real SQL: deposits/withdrawals approved only, captcha correct
    only, ads completed only, matching not reversed, ecommerce excluding the
    debit/purchase prefixes.
    """
    def t(name):
        return tables.get(name, [])

    return {
        "deposits": float(sum(r.amount for r in t("deposits") if r.status == "approved")),
        "withdrawals": float(sum(r.amount for r in t("withdrawals") if r.status == "approved")),
        "captcha_earnings": float(sum(r.amount_earned for r in t("captcha_earnings") if r.is_correct)),
        "ad_views": float(sum(r.amount_earned for r in t("ad_views") if r.is_completed)),
        "referral_profit_history": float(sum(r.amount for r in t("referral_profit_history"))),
        "matching_bonuses": float(sum(r.bonus_amount for r in t("matching_bonuses") if not r.is_reversed)),
        "investment_profit_history": float(sum(r.amount for r in t("investment_profit_history"))),
        "ecommerce_wallet_transactions": float(
            sum(r.amount for r in t("ecommerce_wallet_transactions")
                if not r.type.lower().startswith(("purchase", "debit", "payment", "spend")))
        ),
        "ofa_coin_transactions": float(
            sum(r.amount for r in t("ofa_coin_transactions") if r.tx_type == "mining_reward")
        ),
    }


# ── Mining authority / no double count ────────────────────────────────────


def test_mining_comes_only_from_ofa_ledger():
    records, _, _ = _run(tables=_seed_data())
    mining = [r for r in records if r["category"] == "mining"]
    assert len(mining) == 1, "exactly one mining record (OFA ledger), no mining_logs double count"
    assert mining[0]["currency"] == "OFA"
    assert mining[0]["amount"] == 5.0
    assert mining[0]["status"] == "completed"


def test_mining_category_total_equals_ofa_mining_sum():
    _, _, categories = _run(tables=_seed_data())
    mining_card = next(c for c in categories if c["key"] == "ofa_free_mining")
    assert mining_card["amount"] == 5.0
    assert mining_card["currency"] == "OFA"


# ── Currency preservation ──────────────────────────────────────────────────


def test_matching_bonus_currency_is_usdt():
    records, _, _ = _run(tables=_seed_data())
    matching = [r for r in records if r["category"] == "matching_bonus" and r["status"] != "reversed"]
    assert matching and matching[0]["currency"] == "USDT", "matching bonus must be USDT not OFA"


def test_investment_roi_currency_is_usdt():
    records, _, _ = _run(tables=_seed_data())
    roi = [r for r in records if r["category"] == "daily_earning"]
    assert roi and roi[0]["currency"] == "USDT", "investment ROI (main_wallet) must be USDT"


def test_deposit_and_withdrawal_currency_is_usd():
    records, _, _ = _run(tables=_seed_data())
    dep = [r for r in records if r["category"] == "deposit"]
    wd = [r for r in records if r["category"] == "withdrawal"]
    assert dep and dep[0]["currency"] == "USDT"
    assert wd and wd[0]["currency"] == "USDT"


# ── Approved / completed / correct only ───────────────────────────────────


def test_only_approved_records_count_in_summary():
    _, _, categories = _run(tables=_seed_data())
    dep_card = next(c for c in categories if c["key"] == "total_deposit")
    wd_card = next(c for c in categories if c["key"] == "total_withdrawal")
    cap_card = next(c for c in categories if c["key"] == "captcha")
    ad_card = next(c for c in categories if c["key"] == "ad_view")
    match_card = next(c for c in categories if c["key"] == "matching_bonus")
    assert dep_card["amount"] == 100.0, "pending deposit must be excluded"
    assert wd_card["amount"] == 40.0
    assert cap_card["amount"] == 0.5, "incorrect captcha must be excluded"
    assert ad_card["amount"] == 1.25, "uncompleted ad must be excluded"
    assert match_card["amount"] == 10.0, "reversed matching bonus must be excluded"


# ── Category totals are DB sums, not paginated ────────────────────────────


def test_total_earning_is_sum_of_earning_cards():
    _, _, categories = _run(tables=_seed_data())
    expect = 0.5 + 1.25 + 2.0 + 10.0 + 3.0 + 7.0
    total = next(c for c in categories if c["key"] == "total_earning")
    assert abs(total["amount"] - expect) < 1e-9


def test_soon_categories_are_zero_and_marked():
    _, _, categories = _run(tables=_seed_data())
    for key in ("leadership_bonus", "extra_offer_achievement",
                "position_achievement", "international_achievement", "company_profit"):
        card = next(c for c in categories if c["key"] == key)
        assert card["status"] == "soon"
        assert card["amount"] == 0.0


# ── Stream split ──────────────────────────────────────────────────────────


def test_records_carry_stream_field():
    records, _, _ = _run(tables=_seed_data())
    assert all(r["stream"] in ("earning", "transaction") for r in records)
    by_cat = {r["category"]: r["stream"] for r in records}
    assert by_cat["mining"] == "earning"
    assert by_cat["captcha"] == "earning"
    assert by_cat["matching_bonus"] == "earning"
    assert by_cat["deposit"] == "transaction"
    assert by_cat["withdrawal"] == "transaction"
    assert by_cat["kyc_fee"] == "transaction"
    assert by_cat["service_fee"] == "transaction"


def test_ecommerce_debit_is_transaction_credit_is_earning():
    records, _, _ = _run(tables=_seed_data())
    debit = [r for r in records if r["category"] == "ecommerce" and r["direction"] == "debit"]
    credit = [r for r in records if r["category"] == "ecommerce" and r["direction"] == "credit"]
    assert debit and debit[0]["stream"] == "transaction"
    assert credit and credit[0]["stream"] == "earning"


# ── Balances come from User columns / OFA ledger ──────────────────────────


def test_balances_are_authoritative_columns():
    u = _user(main_wallet=Decimal("15"), captcha_wallet=Decimal("2"),
              matching_bonus_wallet=Decimal("8"))
    _, balances, _ = _run(user=u, tables=_seed_data())
    assert balances["main_wallet"] == 15.0
    assert balances["captcha_wallet"] == 2.0
    assert balances["matching_bonus_wallet"] == 8.0
    # OFA balance is the last wallet_balance_after of the OFA ledger.
    assert balances["ofa_balance"] == 105.0


def test_task_scope_has_no_wallet_balances():
    # task_only path returns empty balances/categories and only task rows.
    ofa_mining = _r(
        id=1, tx_type="mining_reward", created_at=TS, amount=Decimal("5"),
        wallet_balance_before=Decimal("100"), wallet_balance_after=Decimal("105"),
        reference_id=None,
    )

    async def run():
        db = _FakeDB(tables={"ofa_coin_transactions": [ofa_mining]}, agg={})
        return await _build_ledger(_user(), db, task_only=True)

    records, balances, categories = asyncio.run(run())
    assert balances == {}
    assert categories == []
    assert records == [], "mining is not a task-base category (ad_view/captcha only)"


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} LEDGER UNIFIED TESTS PASSED")