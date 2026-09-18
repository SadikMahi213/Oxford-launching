from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import SystemConfig

<<<<<<< HEAD
DEFAULT_REFERRAL_RATES: dict[int, Decimal] = {
=======
DEFAULT_REFERRAL_RATES = {
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    1: Decimal("10"),
    2: Decimal("9"),
    3: Decimal("8"),
    4: Decimal("7"),
    5: Decimal("5"),
}


async def get_referral_level_rates(db: AsyncSession) -> dict[int, Decimal]:
<<<<<<< HEAD
    """Read commission rates from SystemConfig, fall back to defaults.

    Scans all SystemConfig keys matching 'commission_l%d' dynamically,
    so adding a new level (e.g. commission_l6) takes effect immediately
    without code changes.
    """
    from sqlalchemy import text

    result = await db.execute(
        text("SELECT key, value FROM system_config WHERE key ~ '^commission_l\\d+$'")
    )
    rows = result.all()

    rates: dict[int, Decimal] = {}
    for key, value in rows:
        try:
            level = int(key.split("_l")[1])
            rates[level] = Decimal(value)
        except (IndexError, ValueError, Exception):
            continue

    # Fill in any missing levels up to the maximum configured or 5
    max_level = max(rates.keys()) if rates else 0
    for level in range(1, max(max_level + 1, 6)):
        if level not in rates and level in DEFAULT_REFERRAL_RATES:
            rates[level] = DEFAULT_REFERRAL_RATES[level]

    return dict(sorted(rates.items()))
=======
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
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
