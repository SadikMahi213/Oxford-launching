"""
Invoice API Routes — Generate and retrieve PDF invoices.
"""
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.models.user import User
from app.models.invoice import Invoice
from app.models.deposit import Deposit
from app.models.withdrawal import Withdrawal
from app.services.invoice_service import (
    generate_user_invoice,
    _serialize_invoice,
)

router = APIRouter(prefix="/invoice", tags=["Invoice"])


def _fmt(v):
    try:
        return float(v or 0)
    except (ValueError, TypeError):
        return 0.0


def _fmt_date(dt):
    if not dt:
        return "-"
    return dt.strftime("%b %d, %Y")


# ── User Invoice Endpoints ───────────────────────────────────────────────


@router.get("/daily")
async def get_daily_invoice(
    date: str | None = Query(None, description="Date in YYYY-MM-DD format, defaults to today"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a daily transaction invoice for the given date (or today)."""
    ref_date = datetime.now(timezone.utc)
    if date:
        try:
            ref_date = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD")

    day_start = ref_date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(hours=23, minutes=59, seconds=59)

    # Fetch daily deposits and withdrawals
    dep_result = await db.execute(
        select(Deposit).where(
            Deposit.user_id == current_user.id,
            Deposit.created_at >= day_start,
            Deposit.created_at <= day_end,
        ).order_by(Deposit.created_at.desc())
    )
    deposits = dep_result.scalars().all()

    wdw_result = await db.execute(
        select(Withdrawal).where(
            Withdrawal.user_id == current_user.id,
            Withdrawal.created_at >= day_start,
            Withdrawal.created_at <= day_end,
        ).order_by(Withdrawal.created_at.desc())
    )
    withdrawals = wdw_result.scalars().all()

    total_deposit = sum(d.amount for d in deposits) if deposits else Decimal("0")
    total_withdrawal = sum(w.amount for w in withdrawals) if withdrawals else Decimal("0")

    items = []
    for d in deposits:
        items.append({"description": f"Deposit ({d.network_name})", "amount": f"${_fmt(d.amount):.2f}", "status": d.status})
    for w in withdrawals:
        items.append({"description": f"Withdrawal from {w.source_wallet}", "amount": f"${_fmt(w.amount):.2f}", "status": w.status})

    invoice = await generate_user_invoice(
        db=db,
        user=current_user,
        invoice_type="daily",
        amount=total_deposit,
        currency="USDT",
        description=f"Daily Transaction Summary — {_fmt_date(day_start)}",
        period_start=day_start,
        period_end=day_end,
        items=items,
    )

    if not invoice:
        raise HTTPException(500, "Failed to generate invoice")

    return {"invoice": _serialize_invoice(invoice)}


@router.get("/weekly")
async def get_weekly_invoice(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a weekly transaction invoice for the past 7 days."""
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=7)
    week_end = now

    dep_result = await db.execute(
        select(Deposit).where(
            Deposit.user_id == current_user.id,
            Deposit.created_at >= week_start,
        ).order_by(Deposit.created_at.desc())
    )
    deposits = dep_result.scalars().all()

    wdw_result = await db.execute(
        select(Withdrawal).where(
            Withdrawal.user_id == current_user.id,
            Withdrawal.created_at >= week_start,
        ).order_by(Withdrawal.created_at.desc())
    )
    withdrawals = wdw_result.scalars().all()

    total_deposit = sum(d.amount for d in deposits) if deposits else Decimal("0")
    total_withdrawal = sum(w.amount for w in withdrawals) if withdrawals else Decimal("0")

    items = []
    for d in deposits:
        items.append({"description": f"Deposit ({d.network_name}) - {_fmt_date(d.created_at)}", "amount": f"${_fmt(d.amount):.2f}", "status": d.status})
    for w in withdrawals:
        items.append({"description": f"Withdrawal ({w.source_wallet}) - {_fmt_date(w.created_at)}", "amount": f"${_fmt(w.amount):.2f}", "status": w.status})

    invoice = await generate_user_invoice(
        db=db,
        user=current_user,
        invoice_type="weekly",
        amount=total_deposit,
        currency="USDT",
        description=f"Weekly Transaction Summary — {_fmt_date(week_start)} to {_fmt_date(week_end)}",
        period_start=week_start,
        period_end=week_end,
        items=items,
    )

    if not invoice:
        raise HTTPException(500, "Failed to generate invoice")

    return {"invoice": _serialize_invoice(invoice)}


@router.get("/monthly")
async def get_monthly_invoice(
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a monthly transaction invoice."""
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    month_start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        month_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
    else:
        month_end = datetime(y, m + 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)

    dep_result = await db.execute(
        select(Deposit).where(
            Deposit.user_id == current_user.id,
            Deposit.created_at >= month_start,
            Deposit.created_at <= month_end,
        ).order_by(Deposit.created_at.desc())
    )
    deposits = dep_result.scalars().all()

    wdw_result = await db.execute(
        select(Withdrawal).where(
            Withdrawal.user_id == current_user.id,
            Withdrawal.created_at >= month_start,
            Withdrawal.created_at <= month_end,
        ).order_by(Withdrawal.created_at.desc())
    )
    withdrawals = wdw_result.scalars().all()

    total_deposit = sum(d.amount for d in deposits) if deposits else Decimal("0")
    total_withdrawal = sum(w.amount for w in withdrawals) if withdrawals else Decimal("0")

    items = []
    for d in deposits:
        items.append({"description": f"Deposit ({d.network_name}) - {_fmt_date(d.created_at)}", "amount": f"${_fmt(d.amount):.2f}", "status": d.status})
    for w in withdrawals:
        items.append({"description": f"Withdrawal ({w.source_wallet}) - {_fmt_date(w.created_at)}", "amount": f"${_fmt(w.amount):.2f}", "status": w.status})

    invoice = await generate_user_invoice(
        db=db,
        user=current_user,
        invoice_type="monthly",
        amount=total_deposit,
        currency="USDT",
        description=f"Monthly Transaction Summary — {month_start.strftime('%B %Y')}",
        period_start=month_start,
        period_end=month_end,
        items=items,
    )

    if not invoice:
        raise HTTPException(500, "Failed to generate invoice")

    return {"invoice": _serialize_invoice(invoice)}


@router.get("/deposit/{deposit_id}")
async def get_deposit_invoice(
    deposit_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a PDF invoice for a specific deposit."""
    result = await db.execute(
        select(Deposit).where(
            Deposit.id == deposit_id,
            Deposit.user_id == current_user.id,
        )
    )
    deposit = result.scalar_one_or_none()
    if not deposit:
        raise HTTPException(404, "Deposit not found")

    items = [{"description": f"Deposit via {deposit.network_name}", "amount": f"${_fmt(deposit.amount):.2f}", "status": deposit.status}]

    invoice = await generate_user_invoice(
        db=db,
        user=current_user,
        invoice_type="deposit",
        amount=deposit.amount,
        currency="USDT",
        description=f"Deposit Confirmation — {deposit.txid[:16]}...",
        reference_id=deposit.id,
        reference_type="deposit",
        items=items,
    )

    if not invoice:
        raise HTTPException(500, "Failed to generate invoice")

    return {"invoice": _serialize_invoice(invoice)}


@router.get("/withdrawal/{withdrawal_id}")
async def get_withdrawal_invoice(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a PDF invoice for a specific withdrawal."""
    result = await db.execute(
        select(Withdrawal).where(
            Withdrawal.id == withdrawal_id,
            Withdrawal.user_id == current_user.id,
        )
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(404, "Withdrawal not found")

    items = [{"description": f"Withdrawal from {withdrawal.source_wallet}", "amount": f"${_fmt(withdrawal.amount):.2f}", "status": withdrawal.status}]

    invoice = await generate_user_invoice(
        db=db,
        user=current_user,
        invoice_type="withdrawal",
        amount=withdrawal.amount,
        currency="USDT",
        description=f"Withdrawal Confirmation — {withdrawal.destination_address[:16]}...",
        reference_id=withdrawal.id,
        reference_type="withdrawal",
        items=items,
    )

    if not invoice:
        raise HTTPException(500, "Failed to generate invoice")

    return {"invoice": _serialize_invoice(invoice)}


@router.get("/statement")
async def get_full_statement(
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a full monthly account statement with all transactions."""
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    month_start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        month_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
    else:
        month_end = datetime(y, m + 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)

    dep_result = await db.execute(
        select(Deposit).where(
            Deposit.user_id == current_user.id,
            Deposit.created_at >= month_start,
            Deposit.created_at <= month_end,
        ).order_by(Deposit.created_at.desc())
    )
    deposits = dep_result.scalars().all()

    wdw_result = await db.execute(
        select(Withdrawal).where(
            Withdrawal.user_id == current_user.id,
            Withdrawal.created_at >= month_start,
            Withdrawal.created_at <= month_end,
        ).order_by(Withdrawal.created_at.desc())
    )
    withdrawals = wdw_result.scalars().all()

    items = []
    for d in deposits:
        items.append({"description": f"Deposit ({d.network_name}) - {_fmt_date(d.created_at)}", "amount": f"+${_fmt(d.amount):.2f}", "status": d.status})
    for w in withdrawals:
        items.append({"description": f"Withdrawal ({w.source_wallet}) - {_fmt_date(w.created_at)}", "amount": f"-${_fmt(w.amount):.2f}", "status": w.status})

    total_deposit = sum(d.amount for d in deposits) if deposits else Decimal("0")

    invoice = await generate_user_invoice(
        db=db,
        user=current_user,
        invoice_type="statement",
        amount=total_deposit,
        currency="USDT",
        description=f"Full Account Statement — {month_start.strftime('%B %Y')}",
        period_start=month_start,
        period_end=month_end,
        items=items,
    )

    if not invoice:
        raise HTTPException(500, "Failed to generate invoice")

    return {"invoice": _serialize_invoice(invoice)}


# ── Download & List ──────────────────────────────────────────────────


@router.get("/download/{invoice_id}")
async def download_invoice_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a PDF invoice with authentication."""
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    # Check ownership or admin
    if invoice.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Access denied")

    if not invoice.pdf_url or not invoice.pdf_storage_key:
        raise HTTPException(404, "PDF file not available for this invoice")

    # Resolve PDF path relative to project root
    pdf_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "storage", "invoices")
    pdf_path = os.path.join(pdf_dir, invoice.pdf_storage_key)

    if not os.path.exists(pdf_path):
        raise HTTPException(404, "PDF file not found on disk")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{invoice.invoice_number}.pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"',
        },
    )


@router.get("/my")
async def get_my_invoices(
    invoice_type: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all invoices for the current user."""
    query = select(Invoice).where(Invoice.user_id == current_user.id)
    if invoice_type:
        query = query.where(Invoice.invoice_type == invoice_type)
    query = query.order_by(Invoice.created_at.desc()).limit(limit)

    result = await db.execute(query)
    invoices = result.scalars().all()

    return {"invoices": [_serialize_invoice(inv) for inv in invoices]}


# ── Admin Invoice Endpoints ─────────────────────────────────────────────


@router.get("/admin")
async def get_all_invoices_admin(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    invoice_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: List all invoices with user details."""
    query = select(Invoice)
    if invoice_type:
        query = query.where(Invoice.invoice_type == invoice_type)
    query = query.order_by(Invoice.created_at.desc())

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar() or 0

    result = await db.execute(
        query.offset((page - 1) * limit).limit(limit)
    )
    invoices = result.scalars().all()

    # Fetch user names
    user_ids = {inv.user_id for inv in invoices}
    users_map = {}
    if user_ids:
        user_result = await db.execute(
            select(User.id, User.full_name, User.email).where(User.id.in_(user_ids))
        )
        users_map = {uid: {"name": name, "email": email} for uid, name, email in user_result.all()}

    data = []
    for inv in invoices:
        inv_dict = _serialize_invoice(inv)
        user_info = users_map.get(inv.user_id, {})
        inv_dict["user"] = user_info
        data.append(inv_dict)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "invoices": data,
    }


@router.get("/admin/revenue-report")
async def get_revenue_report(
    year: int | None = Query(None),
    month: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Generate a revenue summary report."""
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    month_start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        month_end = datetime(y + 1, 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)
    else:
        month_end = datetime(y, m + 1, 1, tzinfo=timezone.utc) - timedelta(seconds=1)

    # Total deposits approved
    dep_total = await db.execute(
        select(func.coalesce(func.sum(Deposit.amount), 0)).where(
            Deposit.status == "approved",
            Deposit.created_at >= month_start,
            Deposit.created_at <= month_end,
        )
    )
    total_deposits = float(dep_total.scalar() or 0)

    # Total withdrawals approved
    wdw_total = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
            Withdrawal.status == "approved",
            Withdrawal.created_at >= month_start,
            Withdrawal.created_at <= month_end,
        )
    )
    total_withdrawals = float(wdw_total.scalar() or 0)

    # Total new users
    users_count = await db.execute(
        select(func.count(User.id)).where(
            User.created_at >= month_start,
            User.created_at <= month_end,
        )
    )
    new_users = users_count.scalar() or 0

    # Deposit/withdrawal count
    dep_count = await db.execute(
        select(func.count(Deposit.id)).where(
            Deposit.status == "approved",
            Deposit.created_at >= month_start,
            Deposit.created_at <= month_end,
        )
    )
    wdw_count = await db.execute(
        select(func.count(Withdrawal.id)).where(
            Withdrawal.status == "approved",
            Withdrawal.created_at >= month_start,
            Withdrawal.created_at <= month_end,
        )
    )

    return {
        "period": f"{month_start.strftime('%B %Y')}",
        "total_deposits": round(total_deposits, 2),
        "total_withdrawals": round(total_withdrawals, 2),
        "net_flow": round(total_deposits - total_withdrawals, 2),
        "deposit_count": dep_count.scalar() or 0,
        "withdrawal_count": wdw_count.scalar() or 0,
        "new_users": new_users,
        "report_generated": now.isoformat(),
    }
