from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.models.bank_info import BankInfo
from app.models.user import User
from app.schemas.bank_info import BankInfoCreate, BankInfoUpdate, BankInfoResponse
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.utils.notifications import notify_admin


router = APIRouter(prefix="/bank-info", tags=["Bank Information"])


def _serialize_bank_info(info: BankInfo) -> dict:
    return {
        "id": info.id,
        "user_id": info.user_id,
        "user_no": getattr(info, "user_no", None),
        "account_holder_name": info.account_holder_name,
        "bank_name": info.bank_name,
        "account_number": info.account_number,
        "branch_name": info.branch_name,
        "branch_address": info.branch_address,
        "swift_code": info.swift_code,
        "routing_code": info.routing_code,
        "country": info.country,
        "currency": info.currency,
        "account_type": info.account_type,
        "status": info.status,
        "admin_note": info.admin_note,
        "created_at": info.created_at,
        "updated_at": info.updated_at,
    }


@router.post("/")
async def submit_bank_info(
    data: BankInfoCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(BankInfo).where(BankInfo.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Banking information has already been submitted. Contact support to make changes."
        )

    if data.account_holder_name.strip().lower() != (current_user.full_name or "").strip().lower():
        raise HTTPException(
            status_code=400,
            detail="Account holder name must match your registered full name."
        )

    bank_info = BankInfo(
        user_id=current_user.id,
        account_holder_name=data.account_holder_name.strip(),
        bank_name=data.bank_name.strip(),
        account_number=data.account_number.strip(),
        branch_name=data.branch_name.strip(),
        branch_address=data.branch_address.strip(),
        swift_code=data.swift_code.strip(),
        routing_code=data.routing_code.strip() if data.routing_code else None,
        country=data.country.strip(),
        currency=data.currency.strip().upper(),
        account_type=data.account_type.strip().lower(),
        status="pending",
    )
    db.add(bank_info)
    await db.commit()
    await db.refresh(bank_info)

    await notify_admin(
        db=db, type="bank_info_submitted",
        message=f"User {current_user.full_name} submitted banking information for approval.",
        user_id=current_user.id, request=request,
    )

    return {"message": "Banking information submitted successfully and is pending review.", "data": _serialize_bank_info(bank_info)}


@router.get("/my")
async def get_my_bank_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BankInfo).where(BankInfo.user_id == current_user.id)
    )
    bank_info = result.scalar_one_or_none()
    if not bank_info:
        return {"data": None}
    return {"data": _serialize_bank_info(bank_info)}


# ── Admin Endpoints ─────────────────────────────────────────────────────


@router.get("/admin")
async def get_all_bank_info(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    del admin
    result = await db.execute(
        select(BankInfo).options(joinedload(BankInfo.user)).order_by(BankInfo.created_at.desc())
    )
    items = result.scalars().all()
    return {"data": [_serialize_bank_info(item) for item in items]}


@router.patch("/admin/{bank_info_id}")
async def update_bank_info_status(
    bank_info_id: int,
    data: BankInfoUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(BankInfo).where(BankInfo.id == bank_info_id)
    )
    bank_info = result.scalar_one_or_none()
    if not bank_info:
        raise HTTPException(status_code=404, detail="Bank info not found")

    if data.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    bank_info.status = data.status
    if data.admin_note:
        bank_info.admin_note = data.admin_note.strip()

    await db.commit()
    await db.refresh(bank_info)

    notify_type = "bank_info_approved" if data.status == "approved" else "bank_info_rejected"
    await notify_admin(
        db=db, type=notify_type,
        message=f"Banking info for user #{bank_info.user_id} was {data.status}",
        user_id=bank_info.user_id, request=request,
    )

    return {"message": f"Bank info {data.status}", "data": _serialize_bank_info(bank_info)}
