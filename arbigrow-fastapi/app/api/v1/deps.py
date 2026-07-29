from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession


def check_earning_access(user: User) -> None:
    """Raise 403 if user's account status blocks earning features."""
    status = (user.account_status or "").lower()
    if status == "pending_payment":
        raise HTTPException(
            status_code=403,
            detail="Your package payment has not been completed yet. Please complete your payment. Once your payment has been approved by the administrator, all earning features will be activated automatically."
        )
    if status == "on_hold":
        raise HTTPException(
            status_code=403,
            detail="Your account is on hold. Earning features are disabled."
        )
    if status == "inactive":
        raise HTTPException(
            status_code=403,
            detail="Your account is not yet active. Please complete KYC verification."
        )


async def check_earning_access_by_id(user_id: int, db: AsyncSession) -> None:
    """Fetch user by ID and run earning access check."""
    from app.models.user import User
    user = await db.get(User, user_id)
    if user:
        check_earning_access(user)


async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:

    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user
