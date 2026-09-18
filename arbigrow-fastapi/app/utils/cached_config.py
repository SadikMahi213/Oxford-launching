from app.core.cache import config_cache
from app.models.system_config import SystemConfig
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


async def get_config(db: AsyncSession, key: str) -> str | None:
    cache_key = f"syscfg:{key}"
    cached = config_cache.get(cache_key)
    if cached is not None:
        return cached
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == key)
    )
    cfg = result.scalar_one_or_none()
    value = cfg.value if cfg else None
    config_cache.set(cache_key, value, ttl=60)
    return value


async def get_referral_level_rates_cached(db: AsyncSession) -> dict[int, float]:
    cached = config_cache.get("ref_rates")
    if cached is not None:
        return cached
    from app.core.referral import get_referral_level_rates
    rates = await get_referral_level_rates(db)
    config_cache.set("ref_rates", rates, ttl=60)
    return rates


def invalidate_config(key: str = None):
    if key:
        config_cache.delete(f"syscfg:{key}")
    config_cache.delete("ref_rates")
