from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kyc import KYC
from app.models.user import User


async def check_kyc_approved(user: User, db: AsyncSession):
    """Raise HTTPException(403) if the user has not completed KYC approval."""
    kyc_result = await db.execute(select(KYC).where(KYC.user_id == user.id))
    kyc = kyc_result.scalar_one_or_none()

    effective_status = kyc.status.value if kyc else (user.admin_kyc_status or "pending")

    if effective_status != "approved":
        raise HTTPException(
            status_code=403,
            detail=(
                "KYC verification required. "
                "Please complete KYC to access financial features."
            ),
        )
