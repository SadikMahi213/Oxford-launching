from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_config import SystemConfig

DEFAULT_REFERRAL_RATES: dict[int, Decimal] = {
    1: Decimal("10"),
    2: Decimal("9"),
    3: Decimal("8"),
    4: Decimal("7"),
    5: Decimal("5"),
}


async def get_referral_level_rates(db: AsyncSession) -> dict[int, Decimal]:
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
