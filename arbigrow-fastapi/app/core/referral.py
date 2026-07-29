from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import SystemConfig

DEFAULT_REFERRAL_RATES = {
    1: Decimal("10"),
    2: Decimal("9"),
    3: Decimal("8"),
    4: Decimal("7"),
    5: Decimal("5"),
}


async def get_referral_level_rates(db: AsyncSession) -> dict[int, Decimal]:
    """Read commission rates from SystemConfig, fall back to defaults."""
    rates = {}
    for level in range(1, 6):
        result = await db.execute(
            select(SystemConfig).where(SystemConfig.key == f"commission_l{level}")
        )
        row = result.scalar_one_or_none()
        if row and row.value:
            try:
                rates[level] = Decimal(row.value)
            except Exception:
                rates[level] = DEFAULT_REFERRAL_RATES[level]
        else:
            rates[level] = DEFAULT_REFERRAL_RATES[level]
    return rates


REFERRAL_LEVEL_RATES = DEFAULT_REFERRAL_RATES
