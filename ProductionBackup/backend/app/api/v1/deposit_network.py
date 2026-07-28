
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.deposit_network import DepositNetwork
from app.models.user import User
from app.models.system_config import SystemConfig
from app.schemas.deposit_network import DepositNetworkCreate, DepositNetworkUpdate, DepositNetworkResponse
from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from sqlalchemy import select


router = APIRouter(
    prefix="/deposit-networks",
    tags=["Admin Deposit Networks"]
)


@router.post("/")
async def create_deposit_network(
    data: DepositNetworkCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    network = DepositNetwork(**data.model_dump())

    db.add(network)
    await db.commit()
    await db.refresh(network)

    return {
        "message": "Deposit network created",
        "data": network
    }


@router.get("/active")
async def get_active_deposit_networks(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DepositNetwork).where(DepositNetwork.status == True)
    )

    networks = result.scalars().all()

    config_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "min_deposit_amount")
    )
    min_deposit_row = config_result.scalar_one_or_none()
    min_deposit_amount = min_deposit_row.value if min_deposit_row else "10"

    return {
        "data": networks,
        "min_deposit_amount": min_deposit_amount
    }


@router.get("/")
async def get_deposit_networks(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(DepositNetwork)
    )

    networks = result.scalars().all()

    return {
        "data": networks
    }


@router.get("/{network_id}")
async def get_deposit_network(
    network_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(DepositNetwork).where(DepositNetwork.id == network_id)
    )

    network = result.scalar_one_or_none()

    if not network:
        raise HTTPException(status_code=404, detail="Network not found")

    return {
        "data": network
    }


@router.put("/{network_id}")
async def update_deposit_network(
    network_id: int,
    data: DepositNetworkUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(DepositNetwork).where(DepositNetwork.id == network_id)
    )

    network = result.scalar_one_or_none()

    if not network:
        raise HTTPException(status_code=404, detail="Network not found")

    ALLOWED_DEPOSIT_NETWORK_FIELDS = {"network_name", "display_name", "wallet_address", "status"}
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if key not in ALLOWED_DEPOSIT_NETWORK_FIELDS:
            raise HTTPException(status_code=400, detail=f"Field '{key}' cannot be updated")
        setattr(network, key, value)

    await db.commit()
    await db.refresh(network)

    return {
        "message": "Network updated",
        "data": network
    }


@router.delete("/{network_id}")
async def delete_deposit_network(
    network_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(DepositNetwork).where(DepositNetwork.id == network_id)
    )

    network = result.scalar_one_or_none()

    if not network:
        raise HTTPException(status_code=404, detail="Network not found")

    await db.delete(network)
    await db.commit()

    return {
        "message": "Network deleted"
    }
