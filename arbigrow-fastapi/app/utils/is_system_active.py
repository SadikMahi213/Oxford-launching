from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import SystemConfig


async def is_system_active(feature_key: str, db: AsyncSession) -> bool:
    """Check if a system feature is active (handles weekend/maintenance overrides)."""
    today = datetime.now(timezone.utc)
    weekday = today.weekday()

    # Weekend check
    if weekday >= 5:
        config_result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == "weekend_earning_enabled")
        )
        row = config_result.scalar_one_or_none()
        if row and row.value and row.value.lower() == "true":
            return True
        if feature_key in ("daily_work", "daily_earning"):
            return False

    # Feature-specific pause
    pause_key = f"pause_{feature_key}"
    pause_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == pause_key)
    )
    pause_row = pause_result.scalar_one_or_none()
    if pause_row and pause_row.value and pause_row.value.lower() == "true":
        return False

    return True
