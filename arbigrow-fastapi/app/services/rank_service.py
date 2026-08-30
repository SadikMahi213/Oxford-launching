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

# Single source of truth: how many descendant generations count toward volume.
# Team Volume and Matching Bonus MUST always use the same limit.
NETWORK_GENERATION_LIMIT = 10

# Aliases kept for readability at call sites; both derive from the single
# source above so the two can never drift apart.
TEAM_VOLUME_MAX_DEPTH = NETWORK_GENERATION_LIMIT
MATCHING_BONUS_MAX_DEPTH = NETWORK_GENERATION_LIMIT


async def get_team_volume(
    user_id: int,
    db: AsyncSession,
    *,
    cutover: datetime | None = None,
    max_depth: int = NETWORK_GENERATION_LIMIT,
) -> tuple[Decimal, Decimal]:
    """Calculate personal deposit and total team volume.

    Returns (personal_volume, team_volume) where:
      - personal_volume = user's own approved deposits
      - team_volume    = personal_volume + descendants' approved deposits
        (up to ``max_depth`` generations; default ``NETWORK_GENERATION_LIMIT``
        (10) matches the documented business formula for Team Volume)

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
    descendant_result = await db.execute(descendant_stmt, {"uid": user_id, "max_depth": max_depth})
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


async def get_matching_bonus_volume(
    user_id: int,
    db: AsyncSession,
    *,
    cutover: datetime | None = None,
) -> tuple[Decimal, Decimal]:
    """Calculate the volume that counts toward Matching Bonus payouts.

    Identical to :func:`get_team_volume`; aggregates descendants up to
    ``NETWORK_GENERATION_LIMIT`` generations. Matching Bonus and Team Volume
    share the same descendant scope (single source of truth).
    """
    return await get_team_volume(
        user_id,
        db,
        cutover=cutover,
        max_depth=NETWORK_GENERATION_LIMIT,
    )


async def get_rank_eligible_volume(
    user: User,
    db: AsyncSession,
) -> tuple[Decimal, Decimal]:
    """Return the team volume that may count toward a user's rank.

    A user is only eligible once their KYC status is ``approved``. Until then the
    eligible volume is zero. Once approved, rank qualification always uses the
    lifetime Team Volume.  The KYC snapshot is a matching-bonus exclusion only;
    it must never remove pre-KYC volume from rank qualification.
    """
    if not await is_kyc_approved(user, db):
        return Decimal("0"), Decimal("0")
    return await get_team_volume(user.id, db)


async def enforce_kyc_rank_gate(user: User, db: AsyncSession) -> bool:
    """Enforce the KYC-first business rule for rank entitlements.

    If ``user`` is NOT KYC-approved this strips every rank artifact so no later
    code can re-expose it:
      * clears ``current_rank_id``
      * reverses all active ``matching_bonuses`` and recomputes
        ``matching_bonus_wallet`` from the remaining (non-reversed) rows
      * marks active ``rank_histories`` as ``reversed``

    Team Volume is intentionally preserved: it continues accumulating regardless
    of KYC status (volume is always calculated from approved deposits on the fly).

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


def _snapshot_floor(user: User) -> Decimal:
    """The permanent KYC snapshot volume that must never generate bonus again.

    kyc_approved_team_volume is captured at first KYC approval and never changes,
    so every bonus band starts at or above it. Pre-KYC volume is never bonused.
    """
    return getattr(user, "kyc_approved_team_volume", None) or Decimal("0")


def _bonused_floor(user: User) -> Decimal:
    """The highest rank threshold whose matching bonus has already been paid."""
    return getattr(user, "bonused_up_to", None) or Decimal("0")


def _advance_bonused_up_to(user: User, volume: Decimal) -> None:
    """Advance the exact, contiguous matching-bonus watermark.

    This is deliberately a volume value rather than a rank threshold: a deposit
    can end inside a band, and that partial band must not be paid again on the
    next approval event.
    """
    current = _bonused_floor(user)
    if volume > current:
        user.bonused_up_to = volume.quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)


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
) -> bool:
    """Distribute all bonus types for a newly achieved rank.

    Returns True when at least one bonus ledger entry was actually created
    (i.e. a real payout happened). Callers should only advance the
    ``bonused_up_to`` floor when this returns True.
    """
    total_pct = sum(p for _, p in bonus_configs)
    if total_pct > rank.max_matching_percent:
        scale = rank.max_matching_percent / total_pct
        bonus_configs = [
            (bt, (p * scale).quantize(BONUS_PERCENT_PRECISION, rounding=ROUND_HALF_UP))
            for bt, p in bonus_configs
        ]

    created = False
    for bonus_type, percent in bonus_configs:
        entry = await _create_bonus_entries(
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
        if entry is not None:
            created = True

    return created


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


async def _legacy_evaluate_and_process_rank(
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
    """Compatibility entry point for obsolete callers.

    The former implementation incorrectly capped matching payout by the rank
    reached using only post-KYC volume.  Delegate to the authoritative
    snapshot-and-band evaluator below so an accidental legacy call can never
    silently produce a zero payout again.
    """
    return await evaluate_and_process_rank(
        user_id=user_id,
        db=db,
        source_user_id=source_user_id,
        reference_id=reference_id,
        reference_type=reference_type,
        skip_bonus=skip_bonus,
        use_snapshot_volume=use_snapshot_volume,
        snapshot_volume=snapshot_volume,
    )


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
    """Refresh rank and credit only newly bonus-eligible Team Volume.

    Rank and bonus processing intentionally have separate inputs:

    * ``team_volume`` is lifetime volume (self + 10 generations) and is the
      sole basis for the user's current rank.
    * matching bonus starts at the frozen KYC snapshot and ends at the current
      lifetime volume.  ``bonused_up_to`` is an exact watermark, not a rank
      threshold, so a partial band is credited once and only once.
    """
    result = {
        "rank_upgraded": False,
        "bonuses_paid": [],
        "previous_rank": None,
        "new_rank": None,
    }

    user_result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if not user or await enforce_kyc_rank_gate(user, db):
        return result

    # KYC approval supplies the already-captured lifetime snapshot. Every
    # normal deposit event recomputes lifetime Team Volume; never apply a KYC
    # date cutover here, as that would make rank and dashboard totals diverge.
    if use_snapshot_volume and snapshot_volume is not None:
        team_volume = Decimal(snapshot_volume)
    else:
        _, team_volume = await get_team_volume(user_id, db)
    team_volume = team_volume.quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
    user.team_volume = team_volume

    # Rank is always refreshed first and is completely independent of whether a
    # matching-bonus row can be created.
    qualified_rank = await _get_highest_qualified_rank(team_volume, db)
    previous_rank_id = user.current_rank_id
    desired_rank_id = qualified_rank.id if qualified_rank else None
    if desired_rank_id != previous_rank_id:
        user.current_rank_id = desired_rank_id
        result["previous_rank"] = previous_rank_id
        result["new_rank"] = desired_rank_id
        result["rank_upgraded"] = bool(qualified_rank)
        if qualified_rank:
            # Create rank history entries for ALL intermediate ranks between the
            # previous rank and the newly qualified rank.
            current_sort = 0
            if previous_rank_id:
                prev_rank = await db.get(Rank, previous_rank_id)
                if prev_rank:
                    current_sort = prev_rank.sort_order
            all_ranks_result = await db.execute(
                select(Rank)
                .where(
                    Rank.is_active == True,
                    Rank.sort_order > current_sort,
                    Rank.sort_order <= qualified_rank.sort_order,
                )
                .order_by(Rank.sort_order.asc())
            )
            new_ranks = all_ranks_result.scalars().all()
            prev_id = previous_rank_id
            for r in new_ranks:
                await _create_rank_history(
                    user_id=user_id,
                    rank_id=r.id,
                    previous_rank_id=prev_id,
                    team_volume=team_volume,
                    db=db,
                )
                prev_id = r.id

    # KYC approval establishes the rank from the snapshot but must never pay
    # for historical volume. The KYC handler initializes the watermark to the
    # same snapshot before calling this path.
    if skip_bonus:
        return result

    floor = max(_snapshot_floor(user), _bonused_floor(user))
    if team_volume <= floor:
        return result

    ranks_result = await db.execute(
        select(Rank)
        .where(Rank.is_active == True)
        .order_by(Rank.target_volume.asc(), Rank.sort_order.asc())
    )
    ranks = ranks_result.scalars().all()
    if not ranks:
        return result

    rank_ids = [rank.id for rank in ranks]
    config_rows = await db.execute(
        select(RankBonusConfig)
        .where(RankBonusConfig.rank_id.in_(rank_ids))
        .order_by(RankBonusConfig.sort_order)
    )
    bonus_map: dict[int, list[tuple[str, Decimal]]] = {}
    for config in config_rows.scalars().all():
        bonus_map.setdefault(config.rank_id, []).append(
            (config.bonus_type, config.bonus_percent)
        )

    # A rank's percentage applies on the band from its own target_volume to the
    # next rank's target.  For example, Starter (200) pays on 200 -> 500;
    # Silver (500) pays on 500 -> 1000.  No matching bonus is paid for volume
    # below the first rank target.  The floor (kyc_approved_team_volume or
    # bonused_up_to) ensures pre-KYC volume and already-bonused volume is
    # never counted twice.
    for index, rank in enumerate(ranks):
        band_start = rank.target_volume
        band_end = (
            ranks[index + 1].target_volume
            if index + 1 < len(ranks)
            else team_volume
        )

        payout_from = max(floor, band_start)
        payout_to = min(team_volume, band_end)
        if payout_to <= payout_from:
            continue

        eligible_amount = (payout_to - payout_from).quantize(
            WALLET_PRECISION, rounding=ROUND_HALF_UP
        )
        configs = bonus_map.get(rank.id, [])
        if not configs:
            break

        distributed = await _distribute_rank_bonuses(
            user_id=user_id,
            source_user_id=source_user_id,
            rank=rank,
            eligible_amount=eligible_amount,
            db=db,
            bonus_configs=configs,
            reference_id=reference_id,
            reference_type=reference_type,
        )
        if not distributed:
            break

        _advance_bonused_up_to(user, payout_to)
        floor = payout_to
        result["bonuses_paid"].append({
            "rank_id": rank.id,
            "rank_name": rank.name,
            "eligible_amount": str(eligible_amount),
        })

    return result
