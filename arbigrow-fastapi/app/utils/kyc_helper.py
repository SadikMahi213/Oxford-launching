from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.kyc import KYC
from app.models.user import User


async def get_effective_kyc_status(user: User, db: AsyncSession) -> str:
    """Return the effective KYC status for a user, reusing the production KYC mechanism.

    Uses the KYC record status when present, otherwise falls back to the admin-controlled
    status on the User row. Mirrors the existing check_kyc_approved logic.
    """
    kyc_result = await db.execute(select(KYC).where(KYC.user_id == user.id))
    kyc = kyc_result.scalar_one_or_none()
    return kyc.status.value if kyc else (user.admin_kyc_status or "pending")


async def is_kyc_approved(user: User, db: AsyncSession) -> bool:
    """Return True only if the user's KYC status is fully 'approved' (verified)."""
    return await get_effective_kyc_status(user, db) == "approved"


async def check_kyc_approved(user: User, db: AsyncSession):
    """Raise HTTPException(403) if the user has not completed KYC approval."""
    if not await is_kyc_approved(user, db):
        raise HTTPException(
            status_code=403,
            detail=(
                "KYC verification required. "
                "Please complete KYC to access financial features."
            ),
        )
