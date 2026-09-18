from decimal import Decimal, ROUND_HALF_UP
from typing import List

<<<<<<< HEAD
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.referral import get_referral_level_rates
from app.models.user import User

=======
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


# Flat distribution (each level is % of the base amount):
# L1 = profit * 10%
# L2 = profit * 9%
# L3 = profit * 8%
# L4 = profit * 7%
# L5 = profit * 5%
REFERRAL_CHAIN_RATES: tuple[Decimal, ...] = (
    Decimal("0.10"),
    Decimal("0.09"),
    Decimal("0.08"),
    Decimal("0.07"),
    Decimal("0.05"),
)

>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
WALLET_PRECISION = Decimal("0.00000000000001")


def _to_wallet_precision(amount: Decimal) -> Decimal:
    return amount.quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)


<<<<<<< HEAD
def calculate_cascading_referral_amounts(base_profit: Decimal, rates: dict[int, Decimal]) -> List[Decimal]:
    base = Decimal(str(base_profit))
    n = len(rates)
    if base <= 0:
        return [Decimal("0")] * n

    payouts: List[Decimal] = []

    for level in range(1, n + 1):
        rate_pct = rates[level]
        amount = _to_wallet_precision(base * rate_pct / Decimal("100"))
=======
def calculate_cascading_referral_amounts(base_profit: Decimal) -> List[Decimal]:
    base = Decimal(str(base_profit))
    if base <= 0:
        return [Decimal("0")] * len(REFERRAL_CHAIN_RATES)

    payouts: List[Decimal] = []

    for rate in REFERRAL_CHAIN_RATES:
        amount = _to_wallet_precision(base * rate)
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
        payouts.append(amount)

    return payouts


async def apply_cascading_referral_commissions(
    db: AsyncSession,
    user: User,
    base_profit: Decimal,
) -> List[dict]:
<<<<<<< HEAD
    rates = await get_referral_level_rates(db)
    payouts = calculate_cascading_referral_amounts(base_profit, rates)
    parent_ids: list[int | None] = []
    for lvl in range(1, len(rates) + 1):
        ancestor_id = getattr(user, f"parent_lvl_{lvl}_id", None)
        parent_ids.append(ancestor_id)
=======
    payouts = calculate_cascading_referral_amounts(base_profit)
    parent_ids = [
        user.parent_lvl_1_id,
        user.parent_lvl_2_id,
        user.parent_lvl_3_id,
        user.parent_lvl_4_id,
        user.parent_lvl_5_id,
    ]
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0

    distributed: List[dict] = []

    for level_index, parent_id in enumerate(parent_ids):
        amount = payouts[level_index]
        if not parent_id or amount <= 0:
            continue

        parent_user = await db.get(User, parent_id)
        if not parent_user:
            continue

        if level_index == 0:
            parent_user.referral_wallet = _to_wallet_precision(
                parent_user.referral_wallet + amount
            )
            wallet_type = "referral_wallet"
        else:
            parent_user.generation_wallet = _to_wallet_precision(
                parent_user.generation_wallet + amount
            )
            wallet_type = "generation_wallet"

        distributed.append(
            {
                "level": level_index + 1,
                "user_id": parent_user.id,
                "user_no": parent_user.user_no,
                "wallet": wallet_type,
                "amount": amount,
            }
        )

    return distributed
