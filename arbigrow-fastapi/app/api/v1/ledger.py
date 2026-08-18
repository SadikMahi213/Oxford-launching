"""
OFA Earning & Transaction Ledger.

A single server-side endpoint that aggregates a user's transactions from every
authoritative table (earnings, bonuses, deposits, withdrawals, transfers,
OFA coin ledger, KYC wallet transactions, etc.) into one normalized, paginated
ledger. No records are manufactured: only categories that have backing rows are
returned, and the "available balance" is read from authoritative User columns
(or derived from the OFA coin ledger) — never recomputed as a sum of rows.
"""

import asyncio
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.investments import Investment
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.ad_view import AdView
from app.models.captcha import CaptchaEarning
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.matching_bonus import MatchingBonus
from app.models.mining_log import MiningLog
from app.models.ofa_coin_transaction import OFACoinTransaction
from app.models.wallet_transaction import WalletTransaction
from app.models.withdrawal import Withdrawal
from app.models.deposit import Deposit
from app.models.ecommerce_wallet_transaction import EcommerceWalletTransaction
from app.models.transfer_log import TransferLog


router = APIRouter(prefix="/ledger", tags=["Ledger"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _num(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (InvalidOperation, TypeError, ValueError):
        return 0.0


def _iso(dt) -> Optional[str]:
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
    note: Optional[str] = None,
) -> dict:
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
        out.append(_to_record("iph", r.id, r.created_at, "daily_earning",
                              "earning", "credit", r.amount, "USD", "completed"))
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
        out.append(_to_record("mb", r.id, r.created_at, category,
                              "earning", "credit", r.bonus_amount, "OFA", status,
                              reference=r.reference_id))
    return out


async def _mining(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(MiningLog).where(MiningLog.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        out.append(_to_record("ml", r.id, r.created_at, "mining",
                              "earning", "credit", r.amount, "OFA", "completed"))
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
        # Mining rewards are authoritative via mining_logs; skip here to avoid
        # any potential double-counting if a mining_reward OFA row exists.
        if r.tx_type == "mining_reward":
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
        out.append(_to_record("wt", r.id, r.created_at, category,
                              kind, direction, r.amount, "USD", status,
                              reference=r.reference_id))
    return out


async def _withdrawals(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(Withdrawal).where(Withdrawal.user_id == uid))).scalars().all()
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


async def _deposits(db: AsyncSession, uid: int) -> list:
    rows = (await db.execute(select(Deposit).where(Deposit.user_id == uid))).scalars().all()
    out = []
    for r in rows:
        status = _withdrawal_status(r.status)
        out.append(_to_record("dp", r.id, r.created_at, "deposit",
                              "adjustment", "credit", r.amount, "USDT", status,
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


# ── Aggregation ──────────────────────────────────────────────────────────────

async def _build_ledger(user: User, db: AsyncSession) -> tuple[list, dict]:
    uid = user.id
    records, ofa_balance = await asyncio_gather_ledger(user, db, uid)
    records.sort(key=lambda x: x["date"] or "", reverse=True)

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
    return records, balances


async def asyncio_gather_ledger(user, db, uid):
    tasks = [
        _investment_profits(db, uid),
        _ad_views(db, uid),
        _captcha(db, uid),
        _referral_profits(db, uid),
        _matching_bonuses(db, uid),
        _mining(db, uid),
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
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    records, balances = await _build_ledger(current_user, db)

    # ── Apply filters ──
    filtered = records
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
        "total": total,
        "page": page,
        "page_size": page_size,
        "summary": {
            "totals": totals,
            "balances": balances,
        },
    }
