from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from decimal import Decimal

from app.core.database import get_db
from app.models.deposit import Deposit
from app.models.user import User
from app.schemas.deposit import DepositCreate, DepositStatusUpdate
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.utils.email import send_deposit_success_email
from app.services.invoice_service import generate_user_invoice

router = APIRouter(prefix="/deposits", tags=["Deposits"])


# User Create Deposit Request

@router.post("/")
async def create_deposit_request(
    data: DepositCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # check duplicate TXID
    result = await db.execute(
        select(Deposit).where(Deposit.txid == data.txid)
    )

    existing_tx = result.scalar_one_or_none()

    if existing_tx:
        raise HTTPException(
            status_code=400,
            detail="This transaction hash has already been submitted"
        )

    deposit = Deposit(
        user_id=current_user.id,
        network_name=data.network_name,
        amount=data.amount,
        txid=data.txid,
    )

    db.add(deposit)

    await db.commit()
    await db.refresh(deposit)

    return {
        "message": "Deposit request submitted successfully",
        "data": deposit
    }


@router.get("/my")
async def get_my_deposits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    result = await db.execute(
        select(Deposit)
        .where(Deposit.user_id == current_user.id)
        .order_by(Deposit.created_at.desc())
    )

    deposits = result.scalars().all()

    return {
        "data": deposits
    }


@router.get("/admin")
async def get_admin_deposits(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):

    base_query = select(Deposit)

    if status:
        base_query = base_query.where(Deposit.status == status.lower())

    total_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = total_result.scalar() or 0

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    query = (
        base_query
        .options(joinedload(Deposit.user))
        .order_by(Deposit.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    result = await db.execute(query)

    deposits = result.scalars().all()

    data = []

    for d in deposits:
        data.append({
            "id": d.id,
            "amount": float(d.amount),
            "network": d.network_name,
            "txid": d.txid,
            "status": d.status,
            "date": d.created_at,
            "user": {
                "name": d.user.full_name,
                "email": d.user.email
            }
        })

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "data": data
    }


@router.patch("/{deposit_id}")
async def update_deposit_status(
    deposit_id: int,
    data: DepositStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):

    result = await db.execute(
        select(Deposit).where(Deposit.id == deposit_id)
    )

    deposit = result.scalar_one_or_none()

    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    # Prevent double approval
    if deposit.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Deposit already processed"
        )

    # Update deposit status
    deposit.status = data.status

    # If approved → credit wallets
    if data.status == "approved":

        user_result = await db.execute(
            select(User).where(User.id == deposit.user_id)
        )

        user = user_result.scalar_one()

        amount = Decimal(deposit.amount)

        user.main_wallet += amount
        user.deposit_wallet += amount

    await db.commit()
    await db.refresh(deposit)

    if data.status == "approved":
        try:
            await send_deposit_success_email(
                userid=deposit.user_id,
                amount=f"{Decimal(str(deposit.amount)):.2f}",
                currency="USDT",
                tx_hash=deposit.txid,
            )
        except Exception as mail_error:
            print(f"[warn] Failed to send deposit approval email: {mail_error}")

        # Auto-generate deposit invoice
        try:
            await generate_user_invoice(
                db=db,
                user=user,
                invoice_type="deposit",
                amount=deposit.amount,
                currency="USDT",
                description=f"Deposit Confirmation — {deposit.txid[:16]}...",
                reference_id=deposit.id,
                reference_type="deposit",
                items=[{"description": f"Deposit via {deposit.network_name}", "amount": f"${float(deposit.amount):.2f}", "status": "approved"}],
            )
        except Exception as inv_error:
            print(f"[warn] Failed to generate deposit invoice: {inv_error}")

    return {
        "message": f"Deposit {data.status}",
        "data": {
            "deposit_id": deposit.id,
            "status": deposit.status
        }
    }
