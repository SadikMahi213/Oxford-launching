"""
OFA Earning & Transaction Ledger.

A single server-side endpoint that aggregates a user's transactions from every
authoritative table (earnings, bonuses, deposits, withdrawals, transfers,
OFA coin ledger, KYC wallet transactions, etc.) into one normalized, paginated
ledger. No records are manufactured: only categories that have backing rows are
returned, and the "available balance" is read from authoritative User columns
(or derived from the OFA coin ledger) — never recomputed as a sum of rows.

Every record is classified into a `stream` — `"earning"` (genuine earning
sources backed by their own record table) or `"transaction"` (deposits,
withdrawals, fees, KYC holds/refunds, conversions, transfers, adjustments,
ecommerce debits). `?stream=earning|transaction` narrows the page; the
response also ships `earning_history` / `transaction_history` for the current
page and a `summary.categories` array of lifetime DB-aggregated totals (cards)
with `status="soon"` for programmes that have no backing module yet.

`scope=task` remains for backward compatibility and narrows this to the old
TASK-BASED EARNINGS LEDGER: only genuine digital-task earning categories
(ad_view, captcha) are returned, wallet balances are omitted, and no
bonuses/financial/OFA movements are shown.
"""

import asyncio
from datetime import timezone
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.ad_view import AdView
from app.models.captcha import CaptchaEarning
from app.models.deposit import Deposit
from app.models.ecommerce_wallet_transaction import EcommerceWalletTransaction
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.investments import Investment
from app.models.matching_bonus import MatchingBonus
from app.models.ofa_coin_transaction import OFACoinTransaction
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.transfer_log import TransferLog
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction
from app.models.withdrawal import Withdrawal

router = APIRouter(prefix="/ledger", tags=["Ledger"])


# ── Task-based categories ────────────────────────────────────────────────────
# Genuine task-based digital earning activities. Matches the TaskType enum
# (captcha, ad_view). Only these are shown when scope=task.
TASK_CATEGORIES = frozenset({"ad_view", "captcha"})

# ── Stream classification ────────────────────────────────────────────────────
# Earning History vs Transaction History. Earning rows are genuine earning
# sources backed by their own record table; everything else (deposits,
# withdrawals, fees, KYC holds/refunds, conversions, transfers, manual
# adjustments) belongs in Transaction History.
EARNING_STREAM_CATEGORIES = frozenset({
    "ad_view", "captcha", "daily_earning", "referral_bonus", "team_bonus",
    "matching_bonus", "mining", "signup_bonus", "package_bonus",
    "ecommerce_bonus", "ecommerce",
})


def _stream_of(category: str, kind: str) -> str:
    if category in EARNING_STREAM_CATEGORIES:
        # ecommerce wallet debits (product purchases) are not earnings.
        if category == "ecommerce" and kind != "earning":
            return "transaction"
        return "earning"
    return "transaction"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _num(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (InvalidOperation, TypeError, ValueError):
        return 0.0


def _iso(dt) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _withdrawal_status(status: str) -> str:
    return {"approved": "completed", "rejected": "failed"}.get(status, status or "pending")


def _to_record(
    src: str,
    row_id,
    date,
    category: str,
    kind: str,            # earning | deduction | adjustment
    direction: str,       # credit | debit
    amount: Decimal,
    currency: str,        # USD | USDT | OFA
    status: str,
    reference=None,
    note: str | None = None,
) -> dict:
    stream = _stream_of(category, kind)
    return {
        "id": f"{src}:{row_id}",
        "date": _iso(date),
        "category": category,
        "category_label_key": f"ledger.category.{category}",
        "type": kind,
        "direction": direction,
        "amount": _num(amount),
        "currency": currency,
        "status": status,
        "reference": str(reference) if reference is not None else None,
        "note": note,
        "stream": stream,
    }


# ── Per-table fetchers ────────────────────────────────────────────────────────

async def _investment_profits(db: AsyncSession, uid: int) -> list:
    rows = (
        await db.execute(
            select(InvestmentProfitHistory)
            .join(Investment, InvestmentProfitHistory.investment_id == Investment.id)
            .where(Investment.user_id == uid)
        )
    ).scalars().all()
    out = []
    for r in rows:
        # Investment ROI is deposited into the USDT-denominated main_wallet
        # (see deposits/admin_roi flows), not USD.
        out.append(_to_record("iph", r.id, r.created_at, "daily_earning",
                              "earning", "credit", r.amount, "USDT", "completed"))
    return out


async def _ad_views(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(AdView).where(AdView.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        status = "completed" if r.is_completed else "pending"
        out.append(_to_record("ad", r.id, r.completed_at or r.started_at, "ad_view",
                              "earning", "credit", r.amount_earned, "USD", status,
                              reference=r.ad_id))
    return out


async def _captcha(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(CaptchaEarning).where(CaptchaEarning.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        status = "completed" if r.is_correct else "pending"
        out.append(_to_record("cap", r.id, r.created_at, "captcha",
                              "earning", "credit", r.amount_earned, "USD", status))
    return out


async def _referral_profits(db: AsyncSession, uid: int) -> list:
    rows = (
        await db.execute(select(ReferralProfitHistory).where(ReferralProfitHistory.receiver_user_id == uid))
    ).scalars().all()
    out = []
    for r in rows:
        category = "referral_bonus" if (r.level or 1) == 1 else "team_bonus"
        ref = r.investment_id or r.deposit_id
        out.append(_to_record("rph", r.id, r.created_at, category,
                              "earning", "credit", r.amount, "USD", "completed",
                              reference=ref))
    return out


async def _matching_bonuses(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(MatchingBonus).where(MatchingBonus.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        bonus_type = (r.bonus_type or "matching").lower()
        category = "matching_bonus" if bonus_type == "matching" else bonus_type
        status = "reversed" if r.is_reversed else "completed"
        # Matching bonus is credited to the USDT-denominated matching_bonus_wallet
        # (see transfer-matching-bonus: "Insufficient matching bonus balance ...
        # USDT"), NOT OFA. Preserve the original financial unit.
        out.append(_to_record("mb", r.id, r.created_at, category,
                              "earning", "credit", r.bonus_amount, "USDT", status,
                              reference=r.reference_id))
    return out


_OFA_CATEGORY = {
    "signup_bonus": ("signup_bonus", "earning", "credit"),
    "package_signup_bonus": ("package_bonus", "earning", "credit"),
    "referral_bonus": ("referral_bonus", "earning", "credit"),
    "mining_reward": ("mining", "earning", "credit"),
    "ecommerce_seller_bonus": ("ecommerce_bonus", "earning", "credit"),
    "ofa_to_usdt": ("ofa_conversion", "adjustment", "debit"),
    "adjustment": ("manual_adjustment", "adjustment", "auto"),
}


async def _ofa_transactions(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(OFACoinTransaction).where(OFACoinTransaction.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        # Mining rewards are authoritative via the OFA coin ledger (each claim
        # writes an OFACoinTransaction with wallet_balance_before/after proof —
        # the same source admin.py uses for total mining distribution). Map
        # them straight to the "mining" category; MiningLog rows are NOT added
        # separately to avoid double-counting the same claim.
        if r.tx_type == "mining_reward":
            out.append(_to_record("ofa", r.id, r.created_at, "mining",
                                  "earning", "credit", r.amount, "OFA", "completed",
                                  reference=r.id))
            continue
        mapping = _OFA_CATEGORY.get(r.tx_type, ("ofa_transaction", "adjustment", "auto"))
        category, kind, direction = mapping
        if direction == "auto":
            direction = "credit" if (r.amount or 0) >= 0 else "debit"
        out.append(_to_record("ofa", r.id, r.created_at, category,
                              kind, direction, r.amount, "OFA", "completed",
                              reference=r.reference_id))
    return out


_WT_CATEGORY = {
    "kyc_fee_hold": ("kyc_fee", "deduction", "debit", "held"),
    "kyc_fee_release": ("kyc_fee", "deduction", "credit", "completed"),
    "kyc_fee_refund": ("refund", "adjustment", "credit", "refunded"),
    "kyc_fee_reset_refund": ("refund", "adjustment", "credit", "refunded"),
}


async def _wallet_transactions(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(WalletTransaction).where(WalletTransaction.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        mapping = _WT_CATEGORY.get(r.type, ("wallet", "adjustment", "credit", r.status or "completed"))
        category, kind, direction, status = mapping
        # KYC holds/refunds are moved through the USDT deposit wallet.
        out.append(_to_record("wt", r.id, r.created_at, category,
                              kind, direction, r.amount, "USDT", status,
                              reference=r.reference_id))
    return out


async def _withdrawals(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(Withdrawal).where(Withdrawal.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        status = _withdrawal_status(r.status)
        out.append(_to_record("wd", r.id, r.created_at, "withdrawal",
                              "deduction", "debit", r.amount, "USD", status,
                              reference=r.transaction_id))
        if r.charge and _num(r.charge) > 0:
            out.append(_to_record("wdf", r.id, r.created_at, "service_fee",
                                  "deduction", "debit", r.charge, "USD", status,
                                  reference=r.transaction_id))
    return out


async def _deposits(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(Deposit).where(Deposit.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        status = _withdrawal_status(r.status)
        out.append(_to_record("dp", r.id, r.created_at, "deposit",
                              "adjustment", "credit", r.amount, "USD", status,
                              reference=r.txid))
    return out


async def _ecommerce(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(EcommerceWalletTransaction).where(EcommerceWalletTransaction.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        t = (r.type or "").lower()
        if t.startswith(("purchase", "debit", "payment", "spend")):
            kind, direction = "deduction", "debit"
        else:
            kind, direction = "earning", "credit"
        out.append(_to_record("ewt", r.id, r.created_at, "ecommerce",
                              kind, direction, r.amount, "USDT", "completed",
                              reference=r.order_id))
    return out


async def _transfers(db: AsyncSession, uid: int) -> list:
    rows = (
        await db.execute(
            select(TransferLog).where(
                (TransferLog.sender_id == uid) | (TransferLog.receiver_id == uid)
            )
        )
    ).scalars().all()
    out = []
    for r in rows:
        if r.sender_id == uid:
            out.append(_to_record("trs", r.id, r.created_at, "transfer",
                                  "deduction", "debit", r.amount, "USDT",
                                  r.status or "completed", note="sent"))
        if r.receiver_id == uid:
            out.append(_to_record("trr", r.id, r.created_at, "transfer",
                                  "earning", "credit", r.amount, "USDT",
                                  r.status or "completed", note="received"))
    return out


async def _ofa_balance(db: AsyncSession, uid: int) -> float:
    row = (
        await db.execute(
            select(OFACoinTransaction.wallet_balance_after)
            .where(OFACoinTransaction.user_id == uid)
            .order_by(desc(OFACoinTransaction.created_at))
            .limit(1)
        )
    ).first()
    return _num(row[0]) if row else 0.0


# ── Category summary (lifetime, DB-aggregated) ──────────────────────────────
# Each total is a single SQL SUM over an authoritative category table — never a
# sum of paginated records and never a wallet balance. No category listed here
# is "manufactured": leadership plays have no backing module yet and are marked
# status="soon" with amount 0 (the ledger never fabricates rows for them).

_SOON_CATEGORIES = (
    "leadership_bonus",
    "extra_offer_achievement",
    "position_achievement",
    "international_achievement",
    "company_profit",
)


async def _category_summary(db: AsyncSession, uid: int, ofa_balance: float) -> list[dict]:
    async def _sum(query) -> float:
        row = await db.execute(query)
        return _num(row.scalar())

    deposit = _sum(
        select(func.coalesce(func.sum(Deposit.amount), 0)).where(
            Deposit.user_id == uid, Deposit.status == "approved"
        )
    )
    withdrawal = _sum(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
            Withdrawal.user_id == uid, Withdrawal.status == "approved"
        )
    )
    captcha = _sum(
        select(func.coalesce(func.sum(CaptchaEarning.amount_earned), 0)).where(
            CaptchaEarning.user_id == uid, CaptchaEarning.is_correct.is_(True)
        )
    )
    ad_view = _sum(
        select(func.coalesce(func.sum(AdView.amount_earned), 0)).where(
            AdView.user_id == uid, AdView.is_completed.is_(True)
        )
    )
    generation = _sum(
        select(func.coalesce(func.sum(ReferralProfitHistory.amount), 0)).where(
            ReferralProfitHistory.receiver_user_id == uid
        )
    )
    matching = _sum(
        select(func.coalesce(func.sum(MatchingBonus.bonus_amount), 0)).where(
            MatchingBonus.user_id == uid, MatchingBonus.is_reversed.is_(False)
        )
    )
    daily_earning = _sum(
        select(func.coalesce(func.sum(InvestmentProfitHistory.amount), 0))
        .join(Investment, InvestmentProfitHistory.investment_id == Investment.id)
        .where(Investment.user_id == uid)
    )
    ecommerce = _sum(
        select(func.coalesce(func.sum(EcommerceWalletTransaction.amount), 0)).where(
            EcommerceWalletTransaction.user_id == uid,
            ~EcommerceWalletTransaction.type.startswith(("purchase", "debit", "payment", "spend")),
        )
    )
    ofa_mining = _sum(
        select(func.coalesce(func.sum(OFACoinTransaction.amount), 0)).where(
            OFACoinTransaction.user_id == uid,
            OFACoinTransaction.tx_type == "mining_reward",
        )
    )
    deposit, withdrawal, captcha, ad_view, generation, matching, daily_earning, ecommerce, ofa_mining = (
        await asyncio.gather(
            deposit, withdrawal, captcha, ad_view, generation, matching,
            daily_earning, ecommerce, ofa_mining,
        )
    )

    total_earning = round(
        captcha + ad_view + generation + matching + daily_earning + ecommerce, 6
    )

    active = [
        {"key": "total_deposit", "amount": round(deposit, 6), "currency": "USD", "stream": "transaction"},
        {"key": "total_withdrawal", "amount": round(withdrawal, 6), "currency": "USD", "stream": "transaction"},
        {"key": "total_earning", "amount": total_earning, "currency": "USD", "stream": "earning"},
        {"key": "captcha", "amount": round(captcha, 6), "currency": "USD", "stream": "earning"},
        {"key": "ad_view", "amount": round(ad_view, 6), "currency": "USD", "stream": "earning"},
        {"key": "generation_bonus", "amount": round(generation, 6), "currency": "USD", "stream": "earning"},
        {"key": "matching_bonus", "amount": round(matching, 6), "currency": "USDT", "stream": "earning"},
        {"key": "ecommerce_bonus", "amount": round(ecommerce, 6), "currency": "USDT", "stream": "earning"},
        {"key": "ofa_free_mining", "amount": round(ofa_mining, 6), "currency": "OFA", "stream": "earning"},
        {"key": "ofa_settlement_balance", "amount": ofa_balance, "currency": "OFA", "stream": "balance"},
    ]
    soon = [
        {"key": key, "amount": 0.0, "currency": "USD", "stream": "earning"}
        for key in _SOON_CATEGORIES
    ]
    for c in soon:
        c["status"] = "soon"
    for c in active:
        c["status"] = "active"
    return active + soon


# ── Aggregation ──────────────────────────────────────────────────────────────

async def _build_ledger(user: User, db: AsyncSession, task_only: bool = False) -> tuple[list, dict, list]:
    uid = user.id
    records, ofa_balance = await asyncio_gather_ledger(user, db, uid, task_only=task_only)
    records.sort(key=lambda x: x["date"] or "", reverse=True)

    if task_only:
        # Task ledger is not a wallet statement; do not surface wallet balances.
        balances = {}
        categories = []
        return records, balances, categories

    balances = {
        "main_wallet": _num(user.main_wallet),
        "deposit_wallet": _num(user.deposit_wallet),
        "withdraw_wallet": _num(user.withdraw_wallet),
        "referral_wallet": _num(user.referral_wallet),
        "generation_wallet": _num(user.generation_wallet),
        "captcha_wallet": _num(user.captcha_wallet),
        "ad_view_wallet": _num(user.ad_view_wallet),
        "ecommerce_wallet": _num(user.ecommerce_wallet),
        "matching_bonus_wallet": _num(user.matching_bonus_wallet),
        "arbx_wallet": _num(user.arbx_wallet),
        "arbx_mining_wallet": _num(user.arbx_mining_wallet),
        "ofa_balance": ofa_balance,
    }
    categories = await _category_summary(db, uid, ofa_balance)
    return records, balances, categories


async def asyncio_gather_ledger(user, db, uid, task_only: bool = False):
    if task_only:
        tasks = [
            _ad_views(db, uid),
            _captcha(db, uid),
        ]
    else:
        tasks = [
            _investment_profits(db, uid),
            _ad_views(db, uid),
            _captcha(db, uid),
            _referral_profits(db, uid),
            _matching_bonuses(db, uid),
            _ofa_transactions(db, uid),
            _wallet_transactions(db, uid),
            _withdrawals(db, uid),
            _deposits(db, uid),
            _ecommerce(db, uid),
            _transfers(db, uid),
        ]
    results = await asyncio.gather(*tasks)
    records = [item for sub in results for item in sub]
    ofa_balance = await _ofa_balance(db, uid)
    return records, ofa_balance


# ── Route ────────────────────────────────────────────────────────────────────

@router.get("/transactions")
async def get_ledger_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    scope: str | None = Query(None),
    stream: str | None = Query(None),
    category: str | None = Query(None),
    type: str | None = Query(None),
    currency: str | None = Query(None),
    status: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    search: str | None = Query(None),
):
    task_only = scope == "task"
    records, balances, categories = await _build_ledger(current_user, db, task_only=task_only)

    # ── Apply filters ──
    filtered = records
    if task_only:
        # Keep task-based records only; drop everything else explicitly.
        filtered = [r for r in filtered if r["category"] in TASK_CATEGORIES]
    if stream:
        filtered = [r for r in filtered if r["stream"] == stream]
    if category:
        filtered = [r for r in filtered if r["category"] == category]
    if type:
        filtered = [r for r in filtered if r["type"] == type]
    if currency:
        filtered = [r for r in filtered if r["currency"] == currency.upper()]
    if status:
        filtered = [r for r in filtered if r["status"] == status]
    if start_date:
        filtered = [r for r in filtered if (r["date"] or "") >= start_date]
    if end_date:
        filtered = [r for r in filtered if (r["date"] or "") <= end_date]
    if search:
        s = search.lower()
        filtered = [
            r for r in filtered
            if (r["reference"] and s in r["reference"].lower())
            or s in r["category"].lower()
            or s in (r["note"] or "").lower()
        ]

    # ── Summary totals (from the full filtered set, not just the page) ──
    totals: dict = {}
    for r in filtered:
        cur = r["currency"]
        bucket = totals.setdefault(cur, {"credit": 0.0, "debit": 0.0})
        if r["direction"] == "credit":
            bucket["credit"] += r["amount"]
        else:
            bucket["debit"] += r["amount"]
    for cur, bucket in totals.items():
        bucket["net"] = round(bucket["credit"] - bucket["debit"], 6)

    # ── Pagination ──
    total = len(filtered)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = filtered[start:end]

    return {
        "items": page_items,
        "earning_history": [r for r in page_items if r["stream"] == "earning"],
        "transaction_history": [r for r in page_items if r["stream"] == "transaction"],
        "total": total,
        "page": page,
        "page_size": page_size,
        "summary": {
            "totals": totals,
            "balances": balances,
            "categories": categories,
        },
    }
