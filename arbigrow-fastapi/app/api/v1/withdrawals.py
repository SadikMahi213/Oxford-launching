from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.v1.deps import get_current_admin_user, get_current_user, check_earning_access
from app.core.database import get_db
from app.models.bank_info import BankInfo
from app.models.withdrawal_method import WithdrawalMethod
from app.models.system_config import SystemConfig
from app.models.user import User
from app.models.withdrawal import Withdrawal
from app.schemas.withdrawal import WithdrawalCreate, WithdrawalStatusUpdate
from app.tasks.email_tasks import send_withdraw_success_email_task
from app.utils.is_system_active import is_system_active
from app.services.invoice_service import generate_withdrawal_invoice
from app.utils.notifications import notify_admin
from app.utils.kyc_helper import check_kyc_approved
from app.services.security_logger import SecurityLogger

router = APIRouter(prefix="/withdrawals", tags=["Withdrawals"])

WALLET_PRECISION = Decimal("0.00000000000001")
# Withdrawal charge now read dynamically from SystemConfig (withdrawal_charge_percent)
ALLOWED_SOURCE_WALLETS = {
    "main_wallet",
}


def _to_wallet_precision(amount: Decimal) -> Decimal:
    return amount.quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)


def _serialize_withdrawal(withdrawal: Withdrawal, include_user: bool = False) -> dict:
    item = {
        "id": withdrawal.id,
        "source_wallet": withdrawal.source_wallet,
        "withdrawal_method_id": withdrawal.withdrawal_method_id,
        "method_type": withdrawal.method_type,
        "network_name": withdrawal.network_name,
        "amount": float(withdrawal.amount),
        "destination_address": withdrawal.destination_address,
        "account_type": withdrawal.account_type,
        "note": withdrawal.note,
        "status": withdrawal.status,
        "created_at": withdrawal.created_at,
        "processed_at": withdrawal.processed_at,
        "approved_by": withdrawal.approved_by,
    }

    if include_user and withdrawal.user:
        item["user"] = {
            "name": withdrawal.user.full_name,
            "email": withdrawal.user.email,
        }

    if include_user and withdrawal.approver:
        item["approver"] = {
            "name": withdrawal.approver.full_name,
            "email": withdrawal.approver.email,
        }

    return item


@router.post("/")
async def create_withdrawal_request(
    data: WithdrawalCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not await is_system_active("withdrawal", db):
        raise HTTPException(status_code=403, detail="Withdrawals are currently paused (weekend/system maintenance)")
    await check_kyc_approved(current_user, db)
    check_earning_access(current_user)

    if data.source_wallet not in ALLOWED_SOURCE_WALLETS:
        raise HTTPException(status_code=400, detail="Invalid wallet selected")

    # Resolve withdrawal method
    method_result = await db.execute(
        select(WithdrawalMethod).where(
            WithdrawalMethod.id == data.withdrawal_method_id,
            WithdrawalMethod.status.is_(True),
        )
    )
    method = method_result.scalar_one_or_none()
    if not method:
        raise HTTPException(status_code=400, detail="Selected withdrawal method is not active or not found")

    # Validate amount against method limits
    amount = _to_wallet_precision(Decimal(str(data.amount)))
    min_amt = method.min_amount if method.min_amount else Decimal("10")
    max_amt = method.max_amount if method.max_amount else Decimal("700")
    if amount < min_amt:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal amount is {min_amt} USDT")
    if amount > max_amt:
        raise HTTPException(status_code=400, detail=f"Maximum withdrawal amount is {max_amt} USDT")

    bank_info = None
    destination_address: str | None = None
    account_type: str | None = None
    method_type = method.method_type

    if method_type == "bank":
        bank_result = await db.execute(
            select(BankInfo).where(
                BankInfo.user_id == current_user.id,
                BankInfo.status == "approved",
            )
        )
        bank_info = bank_result.scalar_one_or_none()
        if not bank_info:
            raise HTTPException(
                status_code=400,
                detail="No approved banking information found. Please register your bank details first."
            )
        destination_address = f"Bank Transfer — {bank_info.bank_name} ({bank_info.account_number})"
    elif method_type == "network":
        dest = (data.destination_address or "").strip()
        if not dest or len(dest) < 5:
            raise HTTPException(status_code=400, detail="Invalid destination address")
        destination_address = dest
    elif method_type == "mobile":
        dest = (data.destination_address or "").strip()
        if not dest or len(dest) < 5:
            raise HTTPException(status_code=400, detail="Invalid mobile number")
        acc_type = (data.account_type or "").strip().lower()
        if acc_type not in ("agent", "personal"):
            raise HTTPException(status_code=400, detail="Account type must be 'agent' or 'personal'")
        account_type = acc_type
        destination_address = f"{method.display_name} — {dest} ({acc_type})"
    else:
        raise HTTPException(status_code=400, detail="Invalid withdrawal method type")

    # ── Atomic balance reservation ─────────────────────────────────────
    # Lock the user row to prevent concurrent withdrawal double-spend.
    user_result = await db.execute(
        select(User)
        .where(User.id == current_user.id)
        .with_for_update()
    )
    locked_user = user_result.scalar_one_or_none()
    if not locked_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Re-read balance from the locked row ( authoritative, prevents race )
    source_balance = Decimal(
        str(getattr(locked_user, data.source_wallet, Decimal("0")) or 0)
    )

    if source_balance < amount:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient balance in {data.source_wallet}. "
                f"Available: {source_balance}"
            ),
        )

    # Read withdrawal charge from config
    charge_config = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "withdrawal_charge_percent")
    )
    charge_row = charge_config.scalar_one_or_none()
    withdrawal_charge_percent = Decimal(charge_row.value) if charge_row and charge_row.value else Decimal("5")
    charge_amount = (amount * withdrawal_charge_percent / Decimal("100")).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)

    EARNING_WALLETS = {"captcha_wallet", "ad_view_wallet"}
    if data.source_wallet not in EARNING_WALLETS:
        main_balance = Decimal(
            str(getattr(locked_user, "main_wallet", Decimal("0")) or 0))
        required_main_balance = _to_wallet_precision(
            amount + charge_amount
        )
        if main_balance < required_main_balance:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Insufficient main_wallet balance for withdrawal eligibility. "
                    f"Required: {required_main_balance}, Available: {main_balance}"
                ),
            )

    # ── Deduct from source wallet atomically ───────────────────────────
    new_balance = _to_wallet_precision(source_balance - amount)
    setattr(locked_user, data.source_wallet, new_balance)

    withdrawal = Withdrawal(
        user_id=current_user.id,
        source_wallet=data.source_wallet,
        withdrawal_method_id=method.id,
        method_type=method_type,
        network_name=method.name,
        amount=amount,
        charge=charge_amount,
        destination_address=destination_address,
        account_type=account_type,
        bank_info_id=bank_info.id if bank_info else None,
        note=(data.note or "").strip() or None,
        status="pending",
    )
    db.add(withdrawal)

    await db.commit()
    await db.refresh(withdrawal)

    await notify_admin(
        db=db, type="withdrawal_request",
        message=f"User {current_user.full_name} requested withdrawal of {amount} USDT from {data.source_wallet}",
        user_id=current_user.id, request=request,
    )

    return {
        "message": "Withdrawal request submitted successfully",
        "data": _serialize_withdrawal(withdrawal),
    }


@router.get("/my")
async def get_my_withdrawals(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit

    total_result = await db.execute(
        select(func.count(Withdrawal.id)).where(Withdrawal.user_id == current_user.id)
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.user_id == current_user.id)
        .order_by(Withdrawal.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    withdrawals = result.scalars().all()

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "data": [_serialize_withdrawal(withdrawal) for withdrawal in withdrawals]
    }


@router.get("/admin")
async def get_admin_withdrawals(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    del admin

    base_query = select(Withdrawal)

    if status:
        base_query = base_query.where(Withdrawal.status == status.lower())

    total_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = total_result.scalar() or 0

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    result = await db.execute(
        base_query.options(
            joinedload(Withdrawal.user),
            joinedload(Withdrawal.approver),
        )
        .order_by(Withdrawal.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    withdrawals = result.scalars().all()

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "data": [
            _serialize_withdrawal(withdrawal, include_user=True)
            for withdrawal in withdrawals
        ],
    }


@router.patch("/{withdrawal_id}")
async def update_withdrawal_status(
    withdrawal_id: int,
    data: WithdrawalStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.id == withdrawal_id)
        .with_for_update()
    )
    withdrawal = result.scalar_one_or_none()

    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    if withdrawal.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Withdrawal already processed",
        )

    if data.status == "approved":
        user_result = await db.execute(
            select(User)
            .where(User.id == withdrawal.user_id)
            .with_for_update()
        )
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        amount = Decimal(str(withdrawal.amount))
        # Credit withdraw_wallet (cumulative tracking of total withdrawn)
        user.withdraw_wallet = _to_wallet_precision(
            Decimal(str(user.withdraw_wallet or 0)) + amount
        )
        # NOTE: Balance was already deducted at withdrawal creation time.
        # Do NOT deduct again here — that would be a double deduction.

    elif data.status == "rejected":
        user_result = await db.execute(
            select(User)
            .where(User.id == withdrawal.user_id)
            .with_for_update()
        )
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        amount = Decimal(str(withdrawal.amount))
        # Refund the held amount back to the source wallet
        source_balance = Decimal(str(getattr(user, withdrawal.source_wallet, "0") or 0))
        setattr(user, withdrawal.source_wallet, _to_wallet_precision(source_balance + amount))

    withdrawal.status = data.status
    withdrawal.approved_by = admin.id
    withdrawal.processed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(withdrawal)

    notif_type = "withdrawal_approved" if data.status == "approved" else "withdrawal_rejected"
    await notify_admin(
        db=db, type=notif_type,
        message=f"Withdrawal #{withdrawal.id} of {withdrawal.amount} USDT by user #{withdrawal.user_id} was {data.status}",
        user_id=withdrawal.user_id, request=request,
    )

    if data.status == "approved":
        try:
            send_withdraw_success_email_task.delay(
                userid=withdrawal.user_id,
                amount=f"{Decimal(str(withdrawal.amount)):.2f}",
                currency="USDT",
                wallet_address=withdrawal.destination_address,
                tx_hash=None,
            )
        except Exception as mail_error:
            print(f"[warn] Failed to send withdrawal approval email: {mail_error}")

        # Auto-generate withdrawal invoice
        try:
            await generate_withdrawal_invoice(
                db=db,
                user=user,
                withdrawal=withdrawal,
                tx_data={
                    "network": withdrawal.network_name,
                    "destination": withdrawal.destination_address,
                    "previous_balance": max(0, float(user.withdraw_wallet) - float(withdrawal.amount)),
                    "current_balance": float(user.withdraw_wallet),
                    "main_wallet_balance": float(user.main_wallet or 0),
                    "wallet_name": "Withdraw Wallet",
                    "wallet_balance": float(user.withdraw_wallet or 0),
                },
            )
            await db.commit()
        except Exception as inv_error:
            print(f"[warn] Failed to generate withdrawal invoice: {inv_error}")
            await db.rollback()

    return {
        "message": f"Withdrawal {withdrawal.status}",
        "data": _serialize_withdrawal(withdrawal),
    }
