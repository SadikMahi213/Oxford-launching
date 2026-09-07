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

from datetime import timezone
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.ad_view import AdView
from app.models.captcha import CaptchaEarning
from app.models.deposit import Deposit
from app.models.ecommerce_wallet_transaction import EcommerceWalletTransaction
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.investments import Investment
from app.models.kyc import KYC
from app.models.matching_bonus import MatchingBonus
from app.models.ofa_coin_transaction import OFACoinTransaction, OFATransactionType
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.system_config import SystemConfig
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

# Only these five categories appear in Transaction History.
TRANSACTION_STREAM_CATEGORIES = frozenset({
    "deposit", "withdrawal", "kyc_fee", "refund", "package_investment",
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
    currency: str,        # USDT | OFA
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

async def _investment_profits(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = (
        select(InvestmentProfitHistory)
        .join(Investment, InvestmentProfitHistory.investment_id == Investment.id)
        .where(Investment.user_id == uid, *where_extra)
    )
    if limit is not None:
        q = q.order_by(InvestmentProfitHistory.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        # Investment ROI is deposited into the USDT-denominated main_wallet
        # (see deposits/admin_roi flows), not USD.
        out.append(_to_record("iph", r.id, r.created_at, "daily_earning",
                              "earning", "credit", r.amount, "USDT", "completed"))
    return out


async def _ad_views(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(AdView).where(AdView.user_id == uid, *where_extra)
    if limit is not None:
        # Record date is completed_at or started_at (mirrors the mapping below).
        q = q.order_by(func.coalesce(AdView.completed_at, AdView.started_at).desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        status = "completed" if r.is_completed else "pending"
        out.append(_to_record("ad", r.id, r.completed_at or r.started_at, "ad_view",
                              "earning", "credit", r.amount_earned, "USDT", status,
                              reference=r.ad_id))
    return out


async def _captcha(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(CaptchaEarning).where(CaptchaEarning.user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(CaptchaEarning.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        status = "completed" if r.is_correct else "failed"
        out.append(_to_record("cap", r.id, r.created_at, "captcha",
                              "earning", "credit", r.amount_earned, "USDT", status))
    return out


async def _referral_profits(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(ReferralProfitHistory).where(ReferralProfitHistory.receiver_user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(ReferralProfitHistory.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        category = "referral_bonus" if (r.level or 1) == 1 else "team_bonus"
        ref = r.investment_id or r.deposit_id
        out.append(_to_record("rph", r.id, r.created_at, category,
                              "earning", "credit", r.amount, "USDT", "completed",
                              reference=ref))
    return out


async def _matching_bonuses(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(MatchingBonus).where(MatchingBonus.user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(MatchingBonus.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
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


async def _ofa_transactions(db: AsyncSession, uid: int, ofa_to_usdt_rate: Decimal | None = None, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(OFACoinTransaction).where(OFACoinTransaction.user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(OFACoinTransaction.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        if r.tx_type == "mining_reward":
            out.append(_to_record("ofa", r.id, r.created_at, "mining",
                                  "earning", "credit", r.amount, "OFA", "completed",
                                  reference=r.id))
            continue
        mapping = _OFA_CATEGORY.get(r.tx_type, ("ofa_transaction", "adjustment", "auto"))
        category, kind, direction = mapping
        if direction == "auto":
            direction = "credit" if (r.amount or 0) >= 0 else "debit"
        rec = _to_record("ofa", r.id, r.created_at, category,
                         kind, direction, r.amount, "OFA", "completed",
                         reference=r.reference_id)
        if r.tx_type == "ofa_to_usdt" and ofa_to_usdt_rate is not None:
            rec["usdt_received"] = round(float(Decimal(str(r.amount)) * ofa_to_usdt_rate), 6)
        out.append(rec)
    return out


_WT_CATEGORY = {
    "kyc_fee_hold": ("kyc_fee", "deduction", "debit", "held"),
    "kyc_fee_release": ("kyc_fee", "deduction", "credit", "completed"),
    "kyc_fee_refund": ("refund", "adjustment", "credit", "refunded"),
    "kyc_fee_reset_refund": ("refund", "adjustment", "credit", "refunded"),
}


async def _wallet_transactions(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(WalletTransaction).where(WalletTransaction.user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(WalletTransaction.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        mapping = _WT_CATEGORY.get(r.type, ("wallet", "adjustment", "credit", r.status or "completed"))
        category, kind, direction, status = mapping
        # KYC holds/refunds are moved through the USDT deposit wallet.
        out.append(_to_record("wt", r.id, r.created_at, category,
                              kind, direction, r.amount, "USDT", status,
                              reference=r.reference_id))
    return out


async def _withdrawals(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(Withdrawal).where(Withdrawal.user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(Withdrawal.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        status = _withdrawal_status(r.status)
        out.append(_to_record("wd", r.id, r.created_at, "withdrawal",
                              "deduction", "debit", r.amount, "USDT", status,
                              reference=r.transaction_id))
        if r.charge and _num(r.charge) > 0:
            out.append(_to_record("wdf", r.id, r.created_at, "service_fee",
                                  "deduction", "debit", r.charge, "USDT", status,
                                  reference=r.transaction_id))
    return out


async def _deposits(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(Deposit).where(Deposit.user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(Deposit.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        status = _withdrawal_status(r.status)
        out.append(_to_record("dp", r.id, r.created_at, "deposit",
                              "adjustment", "credit", r.amount, "USDT", status,
                              reference=r.txid))
    return out


async def _investment_purchases(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(Investment).where(Investment.user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(Investment.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    out = []
    for r in rows:
        if r.invested_amount and r.invested_amount > 0:
            out.append(_to_record("inv", r.id, r.created_at, "package_investment",
                                  "deduction", "debit", r.invested_amount, "USDT",
                                  "completed", reference=r.package_name))
    return out


async def _ecommerce(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(EcommerceWalletTransaction).where(EcommerceWalletTransaction.user_id == uid, *where_extra)
    if limit is not None:
        q = q.order_by(EcommerceWalletTransaction.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
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


async def _transfers(db: AsyncSession, uid: int, limit: int | None = None, where_extra: tuple = ()) -> list:
    q = select(TransferLog).where(
        (TransferLog.sender_id == uid) | (TransferLog.receiver_id == uid),
        *where_extra,
    )
    if limit is not None:
        q = q.order_by(TransferLog.created_at.desc().nullslast()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
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


async def _category_summary(db: AsyncSession, uid: int, ofa_balance: float, user: User | None = None) -> list[dict]:
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
            ~EcommerceWalletTransaction.type.like("purchase%"),
            ~EcommerceWalletTransaction.type.like("debit%"),
            ~EcommerceWalletTransaction.type.like("payment%"),
            ~EcommerceWalletTransaction.type.like("spend%"),
        )
    )
    ofa_mining = _sum(
        select(func.coalesce(func.sum(OFACoinTransaction.amount), 0)).where(
            OFACoinTransaction.user_id == uid,
            OFACoinTransaction.tx_type == "mining_reward",
        )
    )
    # Additional OFA distribution categories for Total OFA Distribution (authoritative OFACoinTransaction ledger, no double count)
    ofa_signup = _sum(
        select(func.coalesce(func.sum(OFACoinTransaction.amount), 0)).where(
            OFACoinTransaction.user_id == uid,
            OFACoinTransaction.tx_type == "signup_bonus",
        )
    )
    ofa_package = _sum(
        select(func.coalesce(func.sum(OFACoinTransaction.amount), 0)).where(
            OFACoinTransaction.user_id == uid,
            OFACoinTransaction.tx_type == "package_signup_bonus",
        )
    )
    ofa_referral = _sum(
        select(func.coalesce(func.sum(OFACoinTransaction.amount), 0)).where(
            OFACoinTransaction.user_id == uid,
            OFACoinTransaction.tx_type == "referral_bonus",
        )
    )
    ofa_ecommerce = _sum(
        select(func.coalesce(func.sum(OFACoinTransaction.amount), 0)).where(
            OFACoinTransaction.user_id == uid,
            OFACoinTransaction.tx_type == "ecommerce_seller_bonus",
        )
    )
    ofa_to_usdt_ofa = _sum(
        select(func.coalesce(func.sum(OFACoinTransaction.amount), 0)).where(
            OFACoinTransaction.user_id == uid,
            OFACoinTransaction.tx_type == "ofa_to_usdt",
        )
    )
    deposit, withdrawal, captcha, ad_view, generation, matching, daily_earning, ecommerce, ofa_mining, ofa_signup, ofa_package, ofa_referral, ofa_ecommerce, ofa_to_usdt_ofa = (
        await deposit,
        await withdrawal,
        await captcha,
        await ad_view,
        await generation,
        await matching,
        await daily_earning,
        await ecommerce,
        await ofa_mining,
        await ofa_signup,
        await ofa_package,
        await ofa_referral,
        await ofa_ecommerce,
        await ofa_to_usdt_ofa,
    )

    # Authoritative OFA → USDT rate (mirrors user.py convert-ofa-to-usdt).
    rate_res = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "ofa_to_usdt_rate")
    )
    rate_cfg = rate_res.scalar_one_or_none()
    ofa_to_usdt_rate = Decimal(rate_cfg.value) if rate_cfg and rate_cfg.value else Decimal("0.0001")

    total_earning = round(
        captcha + ad_view + generation + matching + daily_earning + ecommerce, 6
    )
    # Total OFA Distribution = sum of legitimate OFA distribution categories (no double count, each backed by OFACoinTransaction)
    # Mining is already authoritative via OFACoinTransaction mining_reward (not MiningLog separately).
    total_ofa_distribution = round(
        ofa_signup + ofa_package + ofa_referral + ofa_ecommerce + ofa_mining, 6
    )

    # OFA Wallet visibility: VIEW is allowed for all users (KYC pending/rejected/non-KYC can SEE the wallet).
    # USE/CONVERT/WITHDRAW remains KYC-gated at the operation layer (convert-ofa-to-usdt etc.).
    # Therefore ofa_settlement_balance is always included; converted USDT is calculated from authoritative ledger.
    ofa_converted = round(float(Decimal(str(ofa_to_usdt_ofa)) * ofa_to_usdt_rate), 6)
    active = [
        {"key": "total_deposit", "amount": round(deposit, 6), "currency": "USDT", "stream": "transaction"},
        {"key": "total_withdrawal", "amount": round(withdrawal, 6), "currency": "USDT", "stream": "transaction"},
        {"key": "total_earning", "amount": total_earning, "currency": "USDT", "stream": "earning"},
        {"key": "captcha", "amount": round(captcha, 6), "currency": "USDT", "stream": "earning"},
        {"key": "ad_view", "amount": round(ad_view, 6), "currency": "USDT", "stream": "earning"},
        {"key": "generation_bonus", "amount": round(generation, 6), "currency": "USDT", "stream": "earning"},
        {"key": "matching_bonus", "amount": round(matching, 6), "currency": "USDT", "stream": "earning"},
        {"key": "ecommerce_bonus", "amount": round(ecommerce, 6), "currency": "USDT", "stream": "earning"},
        {"key": "ofa_free_mining", "amount": round(ofa_mining, 6), "currency": "OFA", "stream": "earning", "balance_ofa": round(ofa_mining, 6)},
        {"key": "ofa_settlement_balance", "amount": ofa_converted, "currency": "USDT", "stream": "balance", "balance_ofa": round(ofa_balance, 6)},
        {"key": "total_ofa_distribution", "amount": total_ofa_distribution, "currency": "OFA", "stream": "earning", "balance_ofa": total_ofa_distribution},
    ]
    soon = [
        {"key": key, "amount": 0.0, "currency": "USDT", "stream": "earning"}
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
    categories = await _category_summary(db, uid, ofa_balance, user)
    return records, balances, categories


async def asyncio_gather_ledger(user, db, uid, task_only: bool = False):
    ofa_to_usdt_rate: Decimal | None = None
    if not task_only:
        rate_res = await db.execute(
            select(SystemConfig).where(SystemConfig.key == "ofa_to_usdt_rate")
        )
        rate_cfg = rate_res.scalar_one_or_none()
        ofa_to_usdt_rate = Decimal(rate_cfg.value) if rate_cfg and rate_cfg.value else Decimal("0.0001")

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
            _ofa_transactions(db, uid, ofa_to_usdt_rate=ofa_to_usdt_rate),
            _wallet_transactions(db, uid),
            _withdrawals(db, uid),
            _deposits(db, uid),
            _investment_purchases(db, uid),
            _ecommerce(db, uid),
            _transfers(db, uid),
        ]
    # NOTE: a single AsyncSession cannot serve concurrent execute() calls, so
    # run the per-table fetchers sequentially (each is a small per-user query).
    records = []
    for coro in tasks:
        records.extend(await coro)
    ofa_balance = await _ofa_balance(db, uid)
    return records, ofa_balance


# ── Fast path: bounded per-table fetch + SQL aggregates ──────────────────────
# Active ONLY when no row-level filters are present (status/type/start_date/
# end_date/search all empty). Stream/category/currency/task-scope/KYC-gate are
# enforced with exact per-table SQL predicates mirroring the Python mapping in
# the fetchers above, and every fetched row yields at least one kept record —
# so per-table top-N + merge is exactly equivalent to full-scan + slice
# (pigeonhole principle). Totals come from per-table SQL SUMs over the same
# predicates (exact numerics, fixed table order); `total` from per-table
# COUNTs. Balances and lifetime category cards reuse the existing helpers.
# Anything else falls through to the legacy full-scan path below, untouched.

_OFA_EARNING_TX_TYPES = frozenset({
    "signup_bonus", "package_signup_bonus", "referral_bonus",
    "mining_reward", "ecommerce_seller_bonus",
})

_OFA_KNOWN_TX_TYPES = _OFA_EARNING_TX_TYPES | frozenset({"ofa_to_usdt", "adjustment"})

_EWT_DEBIT_PREFIXES = ("purchase", "debit", "payment", "spend")

_WT_REFUND_TYPES = frozenset({
    "kyc_fee_refund", "kyc_fee_reset_refund",
})

# Canonical fetcher order (matches asyncio_gather_ledger above, so merged
# ties keep the legacy order).
_FAST_ORDER = ("iph", "ad", "cap", "rph", "mb", "ofa", "wt", "wd", "dp", "inv", "ewt", "trs")

_FAST_CURRENCY = {
    "iph": "USDT", "ad": "USDT", "cap": "USDT", "rph": "USDT", "mb": "USDT",
    "ofa": "OFA", "wt": "USDT", "wd": "USDT", "dp": "USDT", "inv": "USDT",
    "ewt": "USDT", "trs": "USDT",
}

# Categories each source can emit (None = admin/dynamic, never skip on filter).
_FAST_SINGLE_CATEGORY = {
    "iph": "daily_earning", "ad": "ad_view", "cap": "captcha",
    "dp": "deposit", "inv": "package_investment", "ewt": "ecommerce", "trs": "transfer",
}

# Sources whose rows are all in the transaction stream (safe to skip on stream=earning).
_FAST_TRANSACTION_ONLY = frozenset({"wt", "wd", "dp", "inv"})

# Sources whose rows are all in the earning stream (safe to skip on stream=transaction).
_FAST_EARNING_ONLY = frozenset({"iph", "ad", "cap", "rph"})


def _ewt_is_debit():
    lowered = func.lower(func.coalesce(EcommerceWalletTransaction.type, ""))
    return or_(*[lowered.like(p + "%") for p in _EWT_DEBIT_PREFIXES])


def _fast_eligible(status, type_, start_date, end_date, search):
    """Fast path is exact only when no row-level filters are present.

    Stream/category/currency/task-scope/KYC-gate are table-level decisions
    handled by _fast_wheres; status/type/date/search filter individual mapped
    rows and keep using the legacy full-scan path.
    """
    return not any([status, type_, start_date, end_date, search])


def _fast_wheres(key, *, stream, category, currency, task_only, kyc_approved):
    """Return SQL WHERE extras for one source table, or None to skip it.

    Each predicate mirrors the Python record mapping in the fetchers above so
    that every fetched row yields at least one kept record (required for the
    top-N merge to stay exact). Returns None when the table provably
    contributes zero records under the active filters.
    """
    if task_only and key not in ("ad", "cap"):
        return None
    if currency and currency.upper() != _FAST_CURRENCY[key]:
        return None
    if stream == "earning" and key in _FAST_TRANSACTION_ONLY:
        return None
    if stream == "transaction":
        # Transaction History shows only five categories; every other source
        # contributes zero rows here (mirrors the allowlist below).
        if key not in ("dp", "wd", "wt", "inv"):
            return None
    if key in _FAST_SINGLE_CATEGORY:
        if category is not None and category != _FAST_SINGLE_CATEGORY[key]:
            return None
        return []
    if key == "rph":
        if category == "referral_bonus":
            # Mirrors `(r.level or 1) == 1` exactly, including NULL/0.
            return [or_(ReferralProfitHistory.level.is_(None),
                        ReferralProfitHistory.level.in_([0, 1]))]
        if category == "team_bonus":
            return [and_(ReferralProfitHistory.level.is_not(None),
                         ReferralProfitHistory.level.not_in([0, 1]))]
        if category is not None:
            return None
        return []
    if key == "mb":
        # bonus_type is admin-configurable: never skip on category, only narrow.
        if category == "matching_bonus":
            return [func.lower(func.coalesce(MatchingBonus.bonus_type, "matching")) == "matching"]
        if category is not None:
            return [func.lower(MatchingBonus.bonus_type) == category]
        return []
    if key == "ofa":
        conds = []
        if not kyc_approved:
            # Mirrors the KYC gate below (ofa_conversion hidden for non-approved).
            conds.append(OFACoinTransaction.tx_type != "ofa_to_usdt")
        if stream == "earning":
            conds.append(OFACoinTransaction.tx_type.in_(_OFA_EARNING_TX_TYPES))
        elif category == "mining":
            conds.append(OFACoinTransaction.tx_type == "mining_reward")
        elif category == "ofa_transaction":
            conds.append(or_(~OFACoinTransaction.tx_type.in_(_OFA_KNOWN_TX_TYPES),
                             OFACoinTransaction.tx_type.is_(None)))
        elif category is not None:
            back = {"signup_bonus": "signup_bonus", "package_bonus": "package_signup_bonus",
                    "referral_bonus": "referral_bonus", "ecommerce_bonus": "ecommerce_seller_bonus",
                    "ofa_conversion": "ofa_to_usdt", "manual_adjustment": "adjustment"}
            if category not in back:
                return None
            conds.append(OFACoinTransaction.tx_type == back[category])
        return conds
    if key == "wt":
        if category == "kyc_fee":
            return [WalletTransaction.type.in_(["kyc_fee_hold", "kyc_fee_release"])]
        if category == "refund":
            return [WalletTransaction.type.in_(["kyc_fee_refund", "kyc_fee_reset_refund"])]
        if category == "wallet":
            return [and_(WalletTransaction.type.not_in(
                ["kyc_fee_hold", "kyc_fee_release", "kyc_fee_refund", "kyc_fee_reset_refund"]))]
        if category is not None:
            return None
        if stream == "transaction":
            # The allowlist drops "wallet" records; exclude them up front so
            # every fetched row is kept.
            return [WalletTransaction.type.in_(
                ["kyc_fee_hold", "kyc_fee_release", "kyc_fee_refund", "kyc_fee_reset_refund"])]
        return []
    if key == "wd":
        if category == "service_fee":
            return [and_(Withdrawal.charge.is_not(None), Withdrawal.charge > 0)]
        if category is not None and category != "withdrawal":
            return None
        return []
    if key == "dp":
        if category is not None and category != "deposit":
            return None
        return []
    if key == "inv":
        if category is not None and category != "package_investment":
            return None
        return [Investment.invested_amount > 0]
    if key == "ewt":
        if category is not None and category != "ecommerce":
            return None
        if stream == "earning":
            return [~_ewt_is_debit()]
        return []
    if key == "trs":
        if category is not None and category != "transfer":
            return None
        return []
    return []


def _fast_secondary_kept(key, *, stream, category):
    """Whether secondary derived records of this source survive filtering.

    Only withdrawals derive extra records (service_fee splits); every other
    source maps rows 1:1 to kept records once _fast_wheres applies.
    """
    if key != "wd":
        return True
    if category is not None and category != "service_fee":
        return False
    # Any stream filter drops service_fee rows (earning skips withdrawals
    # entirely; transaction's allowlist excludes service_fee).
    if stream is not None:
        return False
    return True


async def _fast_counts_and_totals(db, uid, plan, *, stream, category, kyc_approved):
    """Per-table (record count, credit Decimal, debit Decimal, currency).

    Mirrors the direction mapping in the fetchers above; numerics stay exact
    (Decimal) and are combined in fixed table order by the caller.
    """
    out = {}
    for key in _FAST_ORDER:
        wheres = plan.get(key)
        if wheres is None:
            continue
        ccy = _FAST_CURRENCY[key]
        if key == "iph":
            rows = await db.execute(
                select(func.count(InvestmentProfitHistory.id),
                       func.coalesce(func.sum(InvestmentProfitHistory.amount), 0))
                .join(Investment, InvestmentProfitHistory.investment_id == Investment.id)
                .where(Investment.user_id == uid, *wheres))
            count, credit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal("0"), ccy)
        elif key == "ad":
            rows = await db.execute(
                select(func.count(AdView.id),
                       func.coalesce(func.sum(AdView.amount_earned), 0))
                .where(AdView.user_id == uid, *wheres))
            count, credit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal("0"), ccy)
        elif key == "cap":
            rows = await db.execute(
                select(func.count(CaptchaEarning.id),
                       func.coalesce(func.sum(CaptchaEarning.amount_earned), 0))
                .where(CaptchaEarning.user_id == uid, *wheres))
            count, credit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal("0"), ccy)
        elif key == "rph":
            rows = await db.execute(
                select(func.count(ReferralProfitHistory.id),
                       func.coalesce(func.sum(ReferralProfitHistory.amount), 0))
                .where(ReferralProfitHistory.receiver_user_id == uid, *wheres))
            count, credit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal("0"), ccy)
        elif key == "mb":
            rows = await db.execute(
                select(func.count(MatchingBonus.id),
                       func.coalesce(func.sum(MatchingBonus.bonus_amount), 0))
                .where(MatchingBonus.user_id == uid, *wheres))
            count, credit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal("0"), ccy)
        elif key == "dp":
            rows = await db.execute(
                select(func.count(Deposit.id),
                       func.coalesce(func.sum(Deposit.amount), 0))
                .where(Deposit.user_id == uid, *wheres))
            count, credit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal("0"), ccy)
        elif key == "inv":
            rows = await db.execute(
                select(func.count(Investment.id),
                       func.coalesce(func.sum(Investment.invested_amount), 0))
                .where(Investment.user_id == uid, *wheres))
            count, debit = rows.one()
            out[key] = (count, Decimal("0"), Decimal(str(debit)), ccy)
        elif key == "wd":
            rows = await db.execute(
                select(func.count(Withdrawal.id),
                       func.coalesce(func.sum(Withdrawal.amount), 0),
                       func.coalesce(func.sum(case(
                           (and_(Withdrawal.charge.is_not(None), Withdrawal.charge > 0),
                            Withdrawal.charge), else_=0)), 0))
                .where(Withdrawal.user_id == uid, *wheres))
            count, debit, charge = rows.one()
            debit = Decimal(str(debit)) + Decimal(str(charge))
            if _fast_secondary_kept("wd", stream=stream, category=category):
                charge_rows = (await db.execute(
                    select(func.count(Withdrawal.id))
                    .where(Withdrawal.user_id == uid, *wheres,
                           Withdrawal.charge.is_not(None), Withdrawal.charge > 0))).scalar()
                count = count + charge_rows
            out[key] = (count, Decimal("0"), debit, ccy)
        elif key == "wt":
            hold = WalletTransaction.type == "kyc_fee_hold"
            rows = await db.execute(
                select(func.count(WalletTransaction.id),
                       func.coalesce(func.sum(case((hold, WalletTransaction.amount), else_=0)), 0),
                       func.coalesce(func.sum(case((~hold, WalletTransaction.amount), else_=0)), 0))
                .where(WalletTransaction.user_id == uid, *wheres))
            count, debit, credit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal(str(debit)), ccy)
        elif key == "ofa":
            earn = OFACoinTransaction.tx_type.in_(_OFA_EARNING_TX_TYPES)
            conv = OFACoinTransaction.tx_type == "ofa_to_usdt"
            amt = func.coalesce(OFACoinTransaction.amount, 0)
            rows = await db.execute(
                select(func.count(OFACoinTransaction.id),
                       func.coalesce(func.sum(case(
                           (earn, OFACoinTransaction.amount),
                           (conv, 0),
                           else_=case(((amt >= 0), OFACoinTransaction.amount), else_=0))), 0),
                       func.coalesce(func.sum(case(
                           (earn, 0),
                           (conv, OFACoinTransaction.amount),
                           else_=case(((amt >= 0), 0), else_=OFACoinTransaction.amount))), 0))
                .where(OFACoinTransaction.user_id == uid, *wheres))
            count, credit, debit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal(str(debit)), ccy)
        elif key == "ewt":
            is_debit = _ewt_is_debit()
            rows = await db.execute(
                select(func.count(EcommerceWalletTransaction.id),
                       func.coalesce(func.sum(case((~is_debit, EcommerceWalletTransaction.amount), else_=0)), 0),
                       func.coalesce(func.sum(case((is_debit, EcommerceWalletTransaction.amount), else_=0)), 0))
                .where(EcommerceWalletTransaction.user_id == uid, *wheres))
            count, credit, debit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal(str(debit)), ccy)
        elif key == "trs":
            rows = await db.execute(
                select(func.count(TransferLog.id),
                       func.coalesce(func.sum(case(
                           (TransferLog.receiver_id == uid, TransferLog.amount), else_=0)), 0),
                       func.coalesce(func.sum(case(
                           (TransferLog.sender_id == uid, TransferLog.amount), else_=0)), 0))
                .where(or_(TransferLog.sender_id == uid, TransferLog.receiver_id == uid), *wheres))
            count, credit, debit = rows.one()
            out[key] = (count, Decimal(str(credit)), Decimal(str(debit)), ccy)
    return out


_FAST_FETCHERS = {
    "iph": _investment_profits,
    "ad": _ad_views,
    "cap": _captcha,
    "rph": _referral_profits,
    "mb": _matching_bonuses,
    "ofa": _ofa_transactions,
    "wt": _wallet_transactions,
    "wd": _withdrawals,
    "dp": _deposits,
    "inv": _investment_purchases,
    "ewt": _ecommerce,
    "trs": _transfers,
}


async def _fast_ledger_page(user, db, *, page, page_size, stream, category,
                            currency, task_only, kyc_approved):
    """Bounded fast path for filter-free ledger views.

    Per included table fetches top page*page_size rows (exact by pigeonhole:
    every fetched row yields a kept record), merges in canonical fetcher order
    with a stable date-DESC sort (identical to the legacy path), slices the
    page, and combines per-table SQL aggregates for totals. Balances and
    lifetime category cards reuse the existing helpers unchanged.
    """
    uid = user.id
    limit = page * page_size
    plan = {}
    for key in _FAST_ORDER:
        wheres = _fast_wheres(key, stream=stream, category=category,
                              currency=currency, task_only=task_only,
                              kyc_approved=kyc_approved)
        if wheres is not None:
            plan[key] = wheres
    records = []
    if "ofa" in plan and not task_only:
        rate_res = await db.execute(
            select(SystemConfig).where(SystemConfig.key == "ofa_to_usdt_rate"))
        rate_cfg = rate_res.scalar_one_or_none()
        ofa_rate = Decimal(rate_cfg.value) if rate_cfg and rate_cfg.value else Decimal("0.0001")
    else:
        ofa_rate = None
    for key in _FAST_ORDER:
        if key not in plan:
            continue
        if key == "ofa":
            records.extend(await _ofa_transactions(db, uid, ofa_to_usdt_rate=ofa_rate,
                                                   limit=limit, where_extra=tuple(plan[key])))
        else:
            records.extend(await _FAST_FETCHERS[key](db, uid, limit=limit,
                                                     where_extra=tuple(plan[key])))
    records.sort(key=lambda x: x["date"] or "", reverse=True)
    agg = await _fast_counts_and_totals(db, uid, plan, stream=stream,
                                        category=category, kyc_approved=kyc_approved)
    totals = {}
    present = set()
    for key in _FAST_ORDER:
        if key not in agg:
            continue
        _count, credit, debit, ccy = agg[key]
        if _count:
            present.add(ccy)
        bucket = totals.setdefault(ccy, {"credit": Decimal("0"), "debit": Decimal("0")})
        bucket["credit"] += credit
        bucket["debit"] += debit
    for _cur, bucket in totals.items():
        bucket["net"] = round(float(bucket["credit"]) - float(bucket["debit"]), 6)
        bucket["credit"] = float(bucket["credit"])
        bucket["debit"] = float(bucket["debit"])
    totals = {ccy: bucket for ccy, bucket in totals.items() if ccy in present}
    total = sum(agg[key][0] for key in agg)
    start = (page - 1) * page_size
    page_items = records[start:start + page_size]
    ofa_balance = await _ofa_balance(db, uid)
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
    categories = await _category_summary(db, uid, ofa_balance, user)
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
    kyc_approved = getattr(current_user, "admin_kyc_status", None) == "approved"
    if _fast_eligible(status, type, start_date, end_date, search):
        # Fast path: no row-level filters, so bounded per-table top-N + SQL
        # aggregates are exactly equivalent to full-scan + slice (see above).
        return await _fast_ledger_page(
            current_user, db, page=page, page_size=page_size, stream=stream,
            category=category, currency=currency, task_only=task_only,
            kyc_approved=kyc_approved,
        )
    records, balances, categories = await _build_ledger(current_user, db, task_only=task_only)

    # ── Apply filters ──
    filtered = records
    # KYC gating: hide OFA → USDT conversion records for non-approved users.
    if getattr(current_user, "admin_kyc_status", None) != "approved":
        filtered = [r for r in filtered if r["category"] != "ofa_conversion"]
    if task_only:
        # Keep task-based records only; drop everything else explicitly.
        filtered = [r for r in filtered if r["category"] in TASK_CATEGORIES]
    if stream:
        filtered = [r for r in filtered if r["stream"] == stream]
        # Transaction History shows only the five allowed categories.
        if stream == "transaction":
            filtered = [r for r in filtered if r["category"] in TRANSACTION_STREAM_CATEGORIES]
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


# ── Wallet balances (Ledger section) ──────────────────────────────────────────
# The "Ledger" dashboard section is a wallet overview. It reads the authoritative
# current wallet balances from the User columns (and the derived OFA balance) —
# never a sum of ledger rows. This is a lightweight endpoint that returns only
# the wallet balances, without aggregating the full transaction records.

_WALLET_META = (
    ("main_wallet", "USDT"),
    ("deposit_wallet", "USDT"),
    ("withdraw_wallet", "USDT"),
    ("referral_wallet", "USDT"),
    ("generation_wallet", "USDT"),
    ("captcha_wallet", "USDT"),
    ("ad_view_wallet", "USDT"),
    ("ecommerce_wallet", "USDT"),
    ("matching_bonus_wallet", "USDT"),
    ("arbx_wallet", "OFA"),
    ("arbx_mining_wallet", "OFA"),
    ("ofa_balance", "OFA"),
)


@router.get("/wallets")
async def get_wallet_balances(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the user's current wallet balances for the Ledger overview."""
    ofa_balance = await _ofa_balance(db, current_user.id)
    # Authoritative OFA → USDT rate (mirrors user.py convert-ofa-to-usdt).
    rate_res = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "ofa_to_usdt_rate")
    )
    rate_cfg = rate_res.scalar_one_or_none()
    ofa_to_usdt_rate = Decimal(rate_cfg.value) if rate_cfg and rate_cfg.value else Decimal("0.0001")

    # Check if the user has performed an OFA conversion (ofa_to_usdt transaction).
    # The OFA Wallet must not appear based on KYC alone; it must be triggered by an actual
    # OFA-to-USDT conversion so that KYC = $10 does not create an OFA Ledger entry.
    has_ofa_conversion = await db.execute(
        select(func.count(OFACoinTransaction.id)).where(
            OFACoinTransaction.user_id == current_user.id,
            OFACoinTransaction.tx_type == OFATransactionType.ofa_to_usdt,
        )
    )
    ofa_converted = has_ofa_conversion.scalar() > 0

    # Compute total USDT received from OFA → USDT conversions (same formula as _category_summary).
    ofa_to_usdt_sum = _num(
        (await db.execute(
            select(func.coalesce(func.sum(OFACoinTransaction.amount), 0)).where(
                OFACoinTransaction.user_id == current_user.id,
                OFACoinTransaction.tx_type == OFATransactionType.ofa_to_usdt,
            )
        )).scalar()
    )
    ofa_converted_usdt = round(ofa_to_usdt_sum * float(ofa_to_usdt_rate), 6)

    wallets = []
    for key, currency in _WALLET_META:
        # OFA wallets are visible to all users (including non-KYC) per TASK 1.1 — VIEW vs USE distinction.
        # Conversion/use remains KYC-gated at operation layer, but display is always allowed.
        raw = getattr(current_user, key, None) if key != "ofa_balance" else ofa_balance
        balance = _num(raw)
        entry = {
            "key": key,
            "currency": currency,
            "balance": balance,
        }
        if currency == "OFA":
            entry["balance_usdt"] = float(Decimal(str(balance)) * ofa_to_usdt_rate)
        wallets.append(entry)
    return {
        "wallets": wallets,
        "ofa_to_usdt_rate": float(ofa_to_usdt_rate),
        "ofa_converted_usdt": ofa_converted_usdt,
    }
