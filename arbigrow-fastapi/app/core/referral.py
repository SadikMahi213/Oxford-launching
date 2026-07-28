from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.system_config import SystemConfig


async def get_referral_level_rates(db: AsyncSession) -> dict[int, Decimal]:
    keys = [f"referral_lvl_{i}_percent" for i in range(1, 6)]
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key.in_(keys))
    )
    rows = result.scalars().all()
    config_map = {row.key: row.value for row in rows}
    rates: dict[int, Decimal] = {}
    for i in range(1, 6):
        raw = config_map.get(f"referral_lvl_{i}_percent")
        rates[i] = Decimal(raw) if raw else Decimal("0")
    return rates
