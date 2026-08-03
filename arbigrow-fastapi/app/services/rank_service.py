from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone

from sqlalchemy import select, func as sa_func, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.rank import Rank
from app.models.rank_history import RankHistory
from app.models.matching_bonus import MatchingBonus
from app.models.deposit import Deposit
from app.models.rank_bonus_config import RankBonusConfig
from app.utils.kyc_helper import is_kyc_approved
WALLET_PRECISION = Decimal("0.00000000000001")
BONUS_PERCENT_PRECISION = Decimal("0.0001")
REVERSAL_REASON = "Reversed: user not KYC-verified at time of rank/bonus assignment."


async def get_team_volume(
    user_id: int,
    db: AsyncSession,
    *,
    cutover: datetime | None = None,
) -> tuple[Decimal, Decimal]:
    """Calculate personal deposit and total team volume.

    Returns (personal_volume, team_volume) where:
      - personal_volume = user's own approved deposits
      - team_volume    = personal_volume + all descendants' approved deposits

    When ``cutover`` (the user's ``kyc_approved_at``) is provided, only deposits
    created at or after the cutover count. Deposits made before KYC approval are
    excluded so they never contribute to rank eligibility or matching bonuses.
    """
    # Self deposits (approved)
    self_conds = [
        Deposit.user_id == user_id,
        Deposit.status == "approved",
    ]
    if cutover is not None:
        self_conds.append(Deposit.created_at >= cutover)
    self_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Deposit.amount), 0)).where(*self_conds)
    )
    self_volume = Decimal(str(self_result.scalar()))

    # Find ALL descendant user IDs up to max_depth via recursive CTE
    descendant_stmt = sa_text("""
        WITH RECURSIVE team_tree AS (
            SELECT id, 1 AS depth FROM users WHERE parent_lvl_1_id = :uid
            UNION ALL
            SELECT u.id, tt.depth + 1
            FROM users u
            INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
            WHERE tt.depth < :max_depth
        )
        SELECT id FROM team_tree
    """)
    descendant_result = await db.execute(descendant_stmt, {"uid": user_id, "max_depth": 999})
    descendant_ids = [row[0] for row in descendant_result.fetchall()]

    team_volume = self_volume
    if descendant_ids:
        team_conds = [
            Deposit.user_id.in_(descendant_ids),
            Deposit.status == "approved",
        ]
        if cutover is not None:
            team_conds.append(Deposit.created_at >= cutover)
        team_result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(Deposit.amount), 0)).where(*team_conds)
        )
        team_volume += Decimal(str(team_result.scalar()))

    team_volume = team_volume.quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
    return self_volume, team_volume


async def get_rank_eligible_volume(
    user: User,
    db: AsyncSession,
) -> tuple[Decimal, Decimal]:
    """Return the team volume that may count toward a user's rank.

    A user is only eligible once their KYC status is ``approved``. Until then the
    eligible volume is zero. Once approved, only deposits created at/after
    ``kyc_approved_at`` count, so pre-approval deposits never qualify.
    """
    if not await is_kyc_approved(user, db):
        return Decimal("0"), Decimal("0")
    return await get_team_volume(user.id, db, cutover=user.kyc_approved_at)


async def enforce_kyc_rank_gate(user: User, db: AsyncSession) -> bool:
    """Enforce the KYC-first business rule for rank entitlements.

    If ``user`` is NOT KYC-approved this strips every rank artifact so no later
    code can re-expose it:
      * clears ``current_rank_id``
      * zeroes ``team_volume``
      * reverses all active ``matching_bonuses`` and recomputes
        ``matching_bonus_wallet`` from the remaining (non-reversed) rows
      * marks active ``rank_histories`` as ``reversed``

    Returns True when the user is blocked (not KYC-approved).
    """
    if await is_kyc_approved(user, db):
        return False

    now = datetime.now(timezone.utc)
    changed = False

    bonuses = (
        await db.execute(
            select(MatchingBonus).where(
                MatchingBonus.user_id == user.id,
                MatchingBonus.is_reversed == False,
            )
        )
    ).scalars().all()
    if bonuses:
        changed = True
        for b in bonuses:
            b.is_reversed = True
            b.reversed_at = now
            b.reversal_reason = REVERSAL_REASON

    if user.current_rank_id is not None:
        changed = True
        user.current_rank_id = None
    if (user.team_volume or Decimal("0")) > 0:
        changed = True
        user.team_volume = Decimal("0")

    histories = (
        await db.execute(
            select(RankHistory).where(
                RankHistory.user_id == user.id,
                RankHistory.status == "achieved",
            )
        )
    ).scalars().all()
    if histories:
        changed = True
        for h in histories:
            h.status = "reversed"
            h.released_at = now

    if changed:
        remaining = sum(
            (b.bonus_amount or Decimal("0") for b in bonuses if not b.is_reversed),
            Decimal("0"),
        ).quantize(WALLET_PRECISION)
        user.matching_bonus_wallet = remaining

    return True


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
            MatchingBonus.is_reversed == False,
        )
        .with_for_update()
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
    bonus_configs: list[tuple[str, Decimal]],
    reference_id: int | None = None,
    reference_type: str | None = None,
):
    """Distribute all bonus types for a newly achieved rank."""
    total_pct = sum(p for _, p in bonus_configs)
    if total_pct > rank.max_matching_percent:
        scale = rank.max_matching_percent / total_pct
        bonus_configs = [
            (bt, (p * scale).quantize(BONUS_PERCENT_PRECISION, rounding=ROUND_HALF_UP))
            for bt, p in bonus_configs
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
    skip_bonus: bool = False,
    use_snapshot_volume: bool = False,
    snapshot_volume: Decimal | None = None,
) -> dict:
    """
    Main entry point called after a deposit approval, KYC approval, or investment purchase.
    
    1. Calculates team volume (or uses snapshot from KYC approval)
    2. Checks if user qualifies for a new rank
    3. Distributes matching bonuses for any newly achieved ranks (unless skip_bonus=True)
    4. Saves rank history
    5. Updates user's current_rank_id
    """
    result = {"rank_upgraded": False, "bonuses_paid": [], "previous_rank": None, "new_rank": None}

    user_result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if not user:
        return result

    # KYC guard: a user must be fully KYC-verified (approved) before they can qualify
    # for any rank or receive any matching bonus. Not-approved users are stripped of
    # any existing rank artifacts so a stale rank can never survive or be re-exposed.
    if await enforce_kyc_rank_gate(user, db):
        return result

    # Only deposits created at/after KYC approval count toward team volume, so
    # pre-approval deposits never drive rank eligibility or matching bonuses.
    cutover = getattr(user, "kyc_approved_at", None)

    # Step 1: Calculate personal deposit and total team volume
    if use_snapshot_volume and snapshot_volume is not None:
        team_volume = snapshot_volume
        personal_volume, _ = await get_team_volume(user_id, db, cutover=cutover)
    else:
        personal_volume, team_volume = await get_team_volume(user_id, db, cutover=cutover)

    # Update user's team_volume (even if personal_volume is 0)
    user.team_volume = team_volume

    # Users with zero personal deposit are not eligible for matching bonuses
    if personal_volume <= 0:
        return result

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

    # Pre-load bonus configs for all new ranks
    new_rank_ids = [r.id for r in new_ranks]
    config_rows = await db.execute(
        select(RankBonusConfig)
        .where(RankBonusConfig.rank_id.in_(new_rank_ids))
        .order_by(RankBonusConfig.sort_order)
    )
    bonus_map: dict[int, list[tuple[str, Decimal]]] = {}
    for c in config_rows.scalars().all():
        bonus_map.setdefault(c.rank_id, []).append((c.bonus_type, c.bonus_percent))

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

        # Get bonus configs for this rank
        configs = bonus_map.get(rank.id, [])
        if not configs:
            previous_target = rank.target_volume
            last_achieved_rank = rank
            continue

        # Distribute bonuses for this rank (skip if skip_bonus=True, e.g. from KYC approval)
        if not skip_bonus:
            await _distribute_rank_bonuses(
                user_id=user_id,
                source_user_id=source_user_id,
                rank=rank,
                eligible_amount=eligible,
                db=db,
                bonus_configs=configs,
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
