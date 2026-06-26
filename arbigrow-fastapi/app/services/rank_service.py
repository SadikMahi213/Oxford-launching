from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone

from sqlalchemy import select, or_, func as sa_func, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.rank import Rank
from app.models.rank_history import RankHistory
from app.models.matching_bonus import MatchingBonus
from app.models.deposit import Deposit
from app.models.investments import Investment
from app.schemas.rank import BONUS_TYPES

WALLET_PRECISION = Decimal("0.00000000000001")
BONUS_PERCENT_PRECISION = Decimal("0.0001")


async def get_team_volume(
    user_id: int,
    db: AsyncSession,
) -> tuple[Decimal, Decimal]:
    """Calculate personal deposit and total team volume.

    Returns (personal_volume, team_volume) where:
      - personal_volume = user's own approved deposits
      - team_volume    = personal_volume + all descendants' approved deposits
    """
    # Self deposits (approved)
    self_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Deposit.amount), 0)).where(
            Deposit.user_id == user_id,
            Deposit.status == "approved",
        )
    )
    self_volume = Decimal(str(self_result.scalar()))

    # Find ALL descendant user IDs at any depth via recursive CTE
    descendant_stmt = sa_text("""
        WITH RECURSIVE team_tree AS (
            SELECT id FROM users WHERE parent_lvl_1_id = :uid
            UNION ALL
            SELECT u.id FROM users u
            INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
        )
        SELECT id FROM team_tree
    """)
    descendant_result = await db.execute(descendant_stmt, {"uid": user_id})
    descendant_ids = [row[0] for row in descendant_result.fetchall()]

    team_volume = self_volume
    if descendant_ids:
        team_result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(Deposit.amount), 0)).where(
                Deposit.user_id.in_(descendant_ids),
                Deposit.status == "approved",
            )
        )
        team_volume += Decimal(str(team_result.scalar()))

    team_volume = team_volume.quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
    return self_volume, team_volume


async def _get_highest_qualified_rank(
    team_volume: Decimal,
    db: AsyncSession,
) -> Rank | None:
    """Find the highest active rank the user qualifies for based on team_volume."""
    result = await db.execute(
        select(Rank)
        .where(
            Rank.is_active == True,
            Rank.target_volume <= team_volume,
        )
        .order_by(Rank.sort_order.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _has_rank_bonus_been_paid(
    user_id: int,
    rank_id: int,
    db: AsyncSession,
) -> bool:
    result = await db.execute(
        select(MatchingBonus)
        .where(
            MatchingBonus.user_id == user_id,
            MatchingBonus.rank_id == rank_id,
        )
        .limit(1)
    )
    return result.first() is not None


async def _create_bonus_entries(
    user_id: int,
    source_user_id: int | None,
    rank: Rank,
    eligible_amount: Decimal,
    bonus_type: str,
    bonus_percent: Decimal,
    db: AsyncSession,
    reference_id: int | None = None,
    reference_type: str | None = None,
):
    """Create a single matching bonus ledger entry and credit the wallet."""
    if bonus_percent <= 0:
        return None

    bonus_amount = (eligible_amount * bonus_percent / Decimal("100")).quantize(
        WALLET_PRECISION, rounding=ROUND_HALF_UP
    )
    if bonus_amount <= 0:
        return None

    entry = MatchingBonus(
        user_id=user_id,
        source_user_id=source_user_id,
        rank_id=rank.id,
        bonus_type=bonus_type,
        eligible_amount=eligible_amount,
        bonus_percent=bonus_percent,
        bonus_amount=bonus_amount,
        reference_id=reference_id,
        reference_type=reference_type,
        description=f"{bonus_type.replace('_', ' ').title()} bonus for {rank.name}",
    )
    db.add(entry)

    # Credit the user's matching bonus wallet
    user = await db.get(User, user_id)
    if user:
        user.matching_bonus_wallet = (user.matching_bonus_wallet + bonus_amount).quantize(
            WALLET_PRECISION, rounding=ROUND_HALF_UP
        )

    return entry


async def _distribute_rank_bonuses(
    user_id: int,
    source_user_id: int | None,
    rank: Rank,
    eligible_amount: Decimal,
    db: AsyncSession,
    reference_id: int | None = None,
    reference_type: str | None = None,
):
    """Distribute all bonus types for a newly achieved rank."""
    bonus_configs = [
        ("matching", rank.matching_percent),
        ("extra", rank.extra_bonus_percent),
        ("travel", rank.travel_bonus_percent),
        ("company_profit", rank.company_profit_percent),
        ("development", rank.development_bonus_percent),
        ("international", rank.international_bonus_percent),
        ("position", rank.position_bonus_percent),
    ]

    for bonus_type, percent in bonus_configs:
        await _create_bonus_entries(
            user_id=user_id,
            source_user_id=source_user_id,
            rank=rank,
            eligible_amount=eligible_amount,
            bonus_type=bonus_type,
            bonus_percent=percent,
            db=db,
            reference_id=reference_id,
            reference_type=reference_type,
        )


async def _create_rank_history(
    user_id: int,
    rank_id: int,
    previous_rank_id: int | None,
    team_volume: Decimal,
    db: AsyncSession,
):
    history = RankHistory(
        user_id=user_id,
        rank_id=rank_id,
        previous_rank_id=previous_rank_id,
        team_volume=team_volume,
        status="achieved",
    )
    db.add(history)


async def evaluate_and_process_rank(
    user_id: int,
    db: AsyncSession,
    *,
    source_user_id: int | None = None,
    reference_id: int | None = None,
    reference_type: str | None = None,
) -> dict:
    """
    Main entry point called after a deposit approval or investment purchase.
    
    1. Recalculates team volume
    2. Checks if user qualifies for a new rank
    3. Distributes matching bonuses for any newly achieved ranks
    4. Saves rank history
    5. Updates user's current_rank_id
    """
    result = {"rank_upgraded": False, "bonuses_paid": [], "previous_rank": None, "new_rank": None}

    user = await db.get(User, user_id)
    if not user:
        return result

    # Step 1: Calculate personal deposit and total team volume
    personal_volume, team_volume = await get_team_volume(user_id, db)

    # Users with zero personal deposit are not eligible for any matching bonus
    if personal_volume <= 0:
        return result

    # Update user's team_volume
    user.team_volume = team_volume

    # Step 2: Find highest qualified rank
    qualified_rank = await _get_highest_qualified_rank(team_volume, db)
    if not qualified_rank:
        return result

    # Step 3: Determine current rank sort order
    current_rank_sort = 0
    previous_rank_id = None
    if user.current_rank_id:
        current_rank = await db.get(Rank, user.current_rank_id)
        if current_rank:
            current_rank_sort = current_rank.sort_order
            previous_rank_id = current_rank.id

    if qualified_rank.sort_order <= current_rank_sort:
        return result

    # Step 4: Get all newly achievable ranks between current and qualified
    new_ranks_result = await db.execute(
        select(Rank)
        .where(
            Rank.is_active == True,
            Rank.sort_order > current_rank_sort,
            Rank.sort_order <= qualified_rank.sort_order,
        )
        .order_by(Rank.sort_order.asc())
    )
    new_ranks = new_ranks_result.scalars().all()
    if not new_ranks:
        return result

    # Step 5: Get the previous rank's target volume for eligible calculation
    previous_target = Decimal("0")
    if previous_rank_id:
        prev_rank = await db.get(Rank, previous_rank_id)
        if prev_rank:
            previous_target = prev_rank.target_volume

    # Step 6: Process each newly achieved rank
    last_achieved_rank = None
    for rank in new_ranks:
        # Skip if bonus already paid for this rank (prevents double pay)
        if await _has_rank_bonus_been_paid(user_id, rank.id, db):
            previous_target = rank.target_volume
            last_achieved_rank = rank
            continue

        # Calculate eligible amount for this rank
        eligible = (rank.target_volume - previous_target).quantize(
            WALLET_PRECISION, rounding=ROUND_HALF_UP
        )
        if eligible <= 0:
            previous_target = rank.target_volume
            last_achieved_rank = rank
            continue

        # Distribute bonuses for this rank
        await _distribute_rank_bonuses(
            user_id=user_id,
            source_user_id=source_user_id,
            rank=rank,
            eligible_amount=eligible,
            db=db,
            reference_id=reference_id,
            reference_type=reference_type,
        )

        # Save rank history
        await _create_rank_history(
            user_id=user_id,
            rank_id=rank.id,
            previous_rank_id=previous_rank_id,
            team_volume=team_volume,
            db=db,
        )

        result["bonuses_paid"].append({
            "rank_id": rank.id,
            "rank_name": rank.name,
            "eligible_amount": str(eligible),
        })

        previous_rank_id = rank.id
        previous_target = rank.target_volume
        last_achieved_rank = rank

    # Step 7: Update user's current rank (highest achieved)
    if last_achieved_rank:
        result["previous_rank"] = user.current_rank_id
        user.current_rank_id = last_achieved_rank.id
        result["new_rank"] = last_achieved_rank.id
        result["rank_upgraded"] = True

    return result
