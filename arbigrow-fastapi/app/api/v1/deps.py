from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User


# Heartbeat throttle: only persist last_active_at at most once per minute per
# user to avoid a write on every authenticated request.
_HEARTBEAT_INTERVAL = timedelta(minutes=1)


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
            detail="Your account is temporarily on hold due to task errors. Please wait until the hold expires."
        )
    if status == "suspended":
        raise HTTPException(
            status_code=403,
            detail="Your account has been suspended due to repeated task errors. Please contact support for assistance."
        )
    if status == "permanently_closed":
        raise HTTPException(
            status_code=403,
            detail="Your account has been permanently closed according to the company policy."
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

    # Activity heartbeat: stamp last_active_at (throttled) so the dashboard can
    # report real members currently online. Best-effort: never fail the request
    # if the write does not succeed.
    now = datetime.now(timezone.utc)
    if user.last_active_at is None or (now - user.last_active_at) > _HEARTBEAT_INTERVAL:
        try:
            user.last_active_at = now
            await db.commit()
        except SQLAlchemyError:
            await db.rollback()

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
