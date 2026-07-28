"""
Invoice API Routes — per-transaction invoice generation and retrieval.
"""
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.models.user import User
from app.models.invoice import Invoice
from app.models.deposit import Deposit
from app.models.withdrawal import Withdrawal
from app.services.invoice_service import (
    generate_deposit_invoice,
    generate_withdrawal_invoice,
    serialize_invoice,
)

router = APIRouter(prefix="/invoice", tags=["Invoice"])


@router.get("/deposit/{deposit_id}")
async def get_deposit_invoice(
    deposit_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a per-transaction invoice for a specific deposit."""
    result = await db.execute(
        select(Deposit).where(
            Deposit.id == deposit_id,
            Deposit.user_id == current_user.id,
        )
    )
    deposit = result.scalar_one_or_none()
    if not deposit:
        raise HTTPException(404, "Deposit not found")

    invoice = await generate_deposit_invoice(
        db=db,
        user=current_user,
        deposit=deposit,
        tx_data={
            "network": deposit.network_name,
            "transaction_hash": deposit.txid,
            "transaction_id": deposit.txid or "",
            "main_wallet_balance": float(current_user.main_wallet or 0),
        },
    )
    if not invoice:
        raise HTTPException(500, "Failed to generate invoice")
    return {"invoice": serialize_invoice(invoice)}


@router.get("/withdrawal/{withdrawal_id}")
async def get_withdrawal_invoice(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a per-transaction invoice for a specific withdrawal."""
    result = await db.execute(
        select(Withdrawal).where(
            Withdrawal.id == withdrawal_id,
            Withdrawal.user_id == current_user.id,
        )
    )
    withdrawal = result.scalar_one_or_none()
    if not withdrawal:
        raise HTTPException(404, "Withdrawal not found")

    invoice = await generate_withdrawal_invoice(
        db=db,
        user=current_user,
        withdrawal=withdrawal,
        tx_data={
            "network": withdrawal.network_name,
            "destination": withdrawal.destination_address,
            "transaction_id": withdrawal.txid or "",
            "main_wallet_balance": float(current_user.main_wallet or 0),
        },
    )
    if not invoice:
        raise HTTPException(500, "Failed to generate invoice")
    return {"invoice": serialize_invoice(invoice)}


@router.get("/download/{invoice_id}")
async def download_invoice_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a PDF invoice with authentication."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    if invoice.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Access denied")
    if not invoice.pdf_url or not invoice.pdf_storage_key:
        raise HTTPException(404, "PDF file not available for this invoice")

    pdf_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "storage", "invoices")
    pdf_path = os.path.join(pdf_dir, invoice.pdf_storage_key)
    if not os.path.exists(pdf_path):
        raise HTTPException(404, "PDF file not found on disk")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{invoice.invoice_number}.pdf",
        headers={"Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'},
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
    return {"invoices": [serialize_invoice(inv) for inv in result.scalars().all()]}


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

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    invoices = result.scalars().all()

    user_ids = {inv.user_id for inv in invoices}
    users_map = {}
    if user_ids:
        user_result = await db.execute(
            select(User.id, User.full_name, User.email, User.user_no).where(User.id.in_(user_ids))
        )
        users_map = {uid: {"name": name, "email": email, "user_no": user_no} for uid, name, email, user_no in user_result.all()}

    data = []
    for inv in invoices:
        inv_dict = serialize_invoice(inv)
        inv_dict["user"] = users_map.get(inv.user_id, {})
        data.append(inv_dict)

    return {"total": total, "page": page, "limit": limit, "invoices": data}


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

    dep_amt = await db.execute(
        select(func.coalesce(func.sum(Deposit.amount), 0)).where(
            Deposit.status == "approved",
            Deposit.created_at >= month_start,
            Deposit.created_at <= month_end,
        )
    )
    wdw_amt = await db.execute(
        select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
            Withdrawal.status == "approved",
            Withdrawal.created_at >= month_start,
            Withdrawal.created_at <= month_end,
        )
    )
    users_ct = await db.execute(
        select(func.count(User.id)).where(
            User.created_at >= month_start, User.created_at <= month_end
        )
    )
    dep_ct = await db.execute(
        select(func.count(Deposit.id)).where(
            Deposit.status == "approved",
            Deposit.created_at >= month_start,
            Deposit.created_at <= month_end,
        )
    )
    wdw_ct = await db.execute(
        select(func.count(Withdrawal.id)).where(
            Withdrawal.status == "approved",
            Withdrawal.created_at >= month_start,
            Withdrawal.created_at <= month_end,
        )
    )

    total_deposits = float(dep_amt.scalar() or 0)
    total_withdrawals = float(wdw_amt.scalar() or 0)

    return {
        "period": month_start.strftime("%B %Y"),
        "total_deposits": round(total_deposits, 2),
        "total_withdrawals": round(total_withdrawals, 2),
        "net_flow": round(total_deposits - total_withdrawals, 2),
        "deposit_count": dep_ct.scalar() or 0,
        "withdrawal_count": wdw_ct.scalar() or 0,
        "new_users": users_ct.scalar() or 0,
        "report_generated": now.isoformat(),
    }
