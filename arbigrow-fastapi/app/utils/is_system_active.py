import logging
from datetime import datetime, timezone, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import SystemConfig

logger = logging.getLogger(__name__)

FeatureType = Literal["daily_work", "daily_earning", "withdrawal", "deposit", "purchase", "mining"]

FEATURE_CONFIG_KEYS: dict[FeatureType, str] = {
    "daily_work": "system_daily_work_enabled",
    "daily_earning": "system_daily_earning_enabled",
    "withdrawal": "system_withdrawal_enabled",
    "mining": "mining_enabled",
}

WEEKEND_PAUSED_FEATURES: set[FeatureType] = {"daily_work", "daily_earning", "withdrawal"}


def _is_uk_weekend() -> bool:
    """Check if current time in Europe/London is Saturday (5) or Sunday (6)."""
    try:
        import zoneinfo
        uk_tz = zoneinfo.ZoneInfo("Europe/London")
    except Exception:
        try:
            import pytz
            uk_tz = pytz.timezone("Europe/London")
        except Exception:
            logger.warning("pytz/zoneinfo not available, falling back to UTC weekday")
            now_local = datetime.now(timezone.utc)
            return now_local.weekday() in (5, 6)

    now_uk = datetime.now(uk_tz)
    is_weekend = now_uk.weekday() in (5, 6)
    if is_weekend:
        logger.debug("UK weekend detected (weekday=%s)", now_uk.weekday())
    return is_weekend


async def _is_weekend_restricted(db: AsyncSession) -> bool:
    """Check if weekend restriction is enabled (default: True)."""
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "system_weekend_restricted")
    )
    config = result.scalar_one_or_none()
    if config is not None:
        return config.value.lower() != "false"
    return True


async def is_system_active(feature: FeatureType, db: AsyncSession) -> bool:
    """Check whether a system feature is currently active.

    Rules:
    1. If admin override exists in SystemConfig, respect it.
    2. On UK weekends (Sat/Sun) with weekend restriction enabled:
       daily_work, daily_earning, and withdrawal are disabled.
       Mining remains ON.
    3. All other features (deposit, purchase) are always active.
    """
    if feature not in FEATURE_CONFIG_KEYS:
        return True

    config_key = FEATURE_CONFIG_KEYS[feature]

    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == config_key)
    )
    config = result.scalar_one_or_none()

    if config is not None:
        active = (config.value or "").lower() == "true"
        logger.info("System feature '%s' → %s (admin override)", feature, "active" if active else "paused")
        return active

    if _is_uk_weekend() and feature in WEEKEND_PAUSED_FEATURES:
        if await _is_weekend_restricted(db):
            logger.info("System feature '%s' → paused (UK weekend, restriction enabled)", feature)
            return False
        else:
            logger.info("System feature '%s' → active (UK weekend, but restriction disabled by admin)", feature)
            return True

    logger.debug("System feature '%s' → active", feature)
    return True
