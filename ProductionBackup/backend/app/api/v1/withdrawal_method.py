from sqlalchemy.ext.asyncio import AsyncSession
from app.models.withdrawal_method import WithdrawalMethod
from app.models.user import User
from app.schemas.withdrawal_method import WithdrawalMethodCreate, WithdrawalMethodUpdate, WithdrawalMethodResponse
from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from sqlalchemy import select


router = APIRouter(
    prefix="/withdrawal-methods",
    tags=["Admin Withdrawal Methods"]
)


@router.post("/")
async def create_withdrawal_method(
    data: WithdrawalMethodCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    method = WithdrawalMethod(**data.model_dump())
    db.add(method)
    await db.commit()
    await db.refresh(method)
    return {"message": "Withdrawal method created", "data": method}


@router.get("/active")
async def get_active_withdrawal_methods(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WithdrawalMethod).where(WithdrawalMethod.status == True)
    )
    methods = result.scalars().all()
    return {"data": methods}


@router.get("/")
async def get_withdrawal_methods(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(WithdrawalMethod))
    methods = result.scalars().all()
    return {"data": methods}


@router.get("/{method_id}")
async def get_withdrawal_method(
    method_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(WithdrawalMethod).where(WithdrawalMethod.id == method_id)
    )
    method = result.scalar_one_or_none()
    if not method:
        raise HTTPException(status_code=404, detail="Withdrawal method not found")
    return {"data": method}


@router.put("/{method_id}")
async def update_withdrawal_method(
    method_id: int,
    data: WithdrawalMethodUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(WithdrawalMethod).where(WithdrawalMethod.id == method_id)
    )
    method = result.scalar_one_or_none()
    if not method:
        raise HTTPException(status_code=404, detail="Withdrawal method not found")

    ALLOWED_FIELDS = {
        "method_type", "name", "display_name", "wallet_address",
        "instructions", "min_amount", "max_amount", "fixed_fee", "percent_fee", "status"
    }
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key not in ALLOWED_FIELDS:
            raise HTTPException(status_code=400, detail=f"Field '{key}' cannot be updated")
        setattr(method, key, value)

    await db.commit()
    await db.refresh(method)
    return {"message": "Withdrawal method updated", "data": method}


@router.delete("/{method_id}")
async def delete_withdrawal_method(
    method_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(WithdrawalMethod).where(WithdrawalMethod.id == method_id)
    )
    method = result.scalar_one_or_none()
    if not method:
        raise HTTPException(status_code=404, detail="Withdrawal method not found")
    await db.delete(method)
    await db.commit()
    return {"message": "Withdrawal method deleted"}
