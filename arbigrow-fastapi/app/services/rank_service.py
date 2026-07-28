from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select, func as sa_func, text as sa_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.rank import Rank
from app.models.rank_history import RankHistory
from app.models.matching_bonus import MatchingBonus
from app.models.deposit import Deposit
from app.models.investments import Investment
from app.models.rank_bonus_config import RankBonusConfig
WALLET_PRECISION = Decimal("0.00000000000001")
BONUS_PERCENT_PRECISION = Decimal("0.0001")


@dataclass
class RankEvaluationData:
    total_personal_volume: Decimal
    total_team_volume: Decimal
    personal_volume: Decimal
    team_volume: Decimal
    user_kyc_status: str
    current_rank_id: int | None
    current_rank_sort_order: int
    previous_rank_id: int | None
    previous_target: Decimal
    new_ranks: list[Rank] = field(default_factory=list)
    bonus_map: dict[int, list[tuple[str, Decimal]]] = field(default_factory=dict)


async def get_team_volume(
    user_id: int,
    db: AsyncSession,
    since: datetime | None = None,
) -> tuple[Decimal, Decimal]:
    """Calculate personal deposit and total team volume.

    When `since` is provided, only deposits/investments created at or after
    that timestamp are included.

    Returns (personal_volume, team_volume) where:
      - personal_volume = user's own approved deposits + active investments
      - team_volume     = personal_volume + all descendants' approved deposits
                          + active investments
    """
    # Self deposits (approved) plus active investment purchases
    self_deposit_q = (
        select(sa_func.coalesce(sa_func.sum(Deposit.amount), 0))
        .where(Deposit.user_id == user_id, Deposit.status == "approved")
    )
    if since is not None:
        self_deposit_q = self_deposit_q.where(Deposit.created_at >= since)
    self_deposit_result = await db.execute(self_deposit_q)

    self_invest_q = (
        select(sa_func.coalesce(sa_func.sum(Investment.invested_amount), 0))
        .where(Investment.user_id == user_id, Investment.status == "active")
    )
    if since is not None:
        self_invest_q = self_invest_q.where(Investment.created_at >= since)
    self_invest_result = await db.execute(self_invest_q)

    self_volume = Decimal(str(self_deposit_result.scalar())) + Decimal(str(self_invest_result.scalar()))

    # Sum descendant deposits & investments directly inside the recursive CTE,
    # avoiding an IN clause that would hit asyncpg's 32 767 bind‑parameter limit
    # on large networks.
    if since is not None:
        team_volume_stmt = sa_text("""
            WITH RECURSIVE team_tree AS (
                SELECT id, 1 AS depth FROM users WHERE parent_lvl_1_id = :uid
                UNION ALL
                SELECT u.id, tt.depth + 1
                FROM users u
                INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
                WHERE tt.depth < :max_depth
            )
            SELECT
                coalesce(
                    (SELECT sum(d.amount) FROM deposits d
                     INNER JOIN team_tree tt ON d.user_id = tt.id
                     WHERE d.status = 'approved' AND d.created_at >= :since),
                    0
                )
                +
                coalesce(
                    (SELECT sum(i.invested_amount) FROM investments i
                     INNER JOIN team_tree tt ON i.user_id = tt.id
                     WHERE i.status = 'active' AND i.created_at >= :since),
                    0
                )
        """)
        params = {"uid": user_id, "max_depth": 40, "since": since}
    else:
        team_volume_stmt = sa_text("""
            WITH RECURSIVE team_tree AS (
                SELECT id, 1 AS depth FROM users WHERE parent_lvl_1_id = :uid
                UNION ALL
                SELECT u.id, tt.depth + 1
                FROM users u
                INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
                WHERE tt.depth < :max_depth
            )
            SELECT
                coalesce(
                    (SELECT sum(d.amount) FROM deposits d
                     INNER JOIN team_tree tt ON d.user_id = tt.id
                     WHERE d.status = 'approved'),
                    0
                )
                +
                coalesce(
                    (SELECT sum(i.invested_amount) FROM investments i
                     INNER JOIN team_tree tt ON i.user_id = tt.id
                     WHERE i.status = 'active'),
                    0
                )
        """)
        params = {"uid": user_id, "max_depth": 40}

    team_result = await db.execute(team_volume_stmt, params)
    team_descendant_volume = Decimal(str(team_result.scalar()))
    team_volume = (self_volume + team_descendant_volume).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
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


async def get_rank_evaluation_data(
    user_id: int,
    db: AsyncSession,
    *,
    use_snapshot_volume: bool = False,
    snapshot_volume: Decimal | None = None,
    skip_bonus: bool = False,
) -> RankEvaluationData | None:
    """Read-only phase: compute team volumes and determine rank qualification.

    No FOR UPDATE locks are acquired.  Returns None if the user doesn't exist.
    """
    user = await db.get(User, user_id)
    if not user:
        return None

    total_personal, total_team = await get_team_volume(user_id, db)

    if use_snapshot_volume:
        personal_volume = total_personal
        team_volume = snapshot_volume if snapshot_volume is not None else total_team
    elif user.kyc_approved_at and not skip_bonus:
        personal_volume, team_volume = await get_team_volume(user_id, db, since=user.kyc_approved_at)
    else:
        personal_volume, team_volume = total_personal, total_team

    if user.admin_kyc_status != "approved":
        return RankEvaluationData(
            total_personal_volume=total_personal,
            total_team_volume=total_team,
            personal_volume=personal_volume,
            team_volume=team_volume,
            user_kyc_status=user.admin_kyc_status,
            current_rank_id=user.current_rank_id,
            current_rank_sort_order=0,
            previous_rank_id=None,
            previous_target=Decimal("0"),
        )

    if personal_volume <= 0:
        return RankEvaluationData(
            total_personal_volume=total_personal,
            total_team_volume=total_team,
            personal_volume=personal_volume,
            team_volume=team_volume,
            user_kyc_status=user.admin_kyc_status,
            current_rank_id=user.current_rank_id,
            current_rank_sort_order=0,
            previous_rank_id=None,
            previous_target=Decimal("0"),
        )

    qualified_rank = await _get_highest_qualified_rank(team_volume, db)
    if not qualified_rank:
        return RankEvaluationData(
            total_personal_volume=total_personal,
            total_team_volume=total_team,
            personal_volume=personal_volume,
            team_volume=team_volume,
            user_kyc_status=user.admin_kyc_status,
            current_rank_id=user.current_rank_id,
            current_rank_sort_order=0,
            previous_rank_id=None,
            previous_target=Decimal("0"),
        )

    current_rank_sort = 0
    previous_rank_id = None
    if user.current_rank_id:
        current_rank = await db.get(Rank, user.current_rank_id)
        if current_rank:
            current_rank_sort = current_rank.sort_order
            previous_rank_id = current_rank.id

    if qualified_rank.sort_order <= current_rank_sort:
        return RankEvaluationData(
            total_personal_volume=total_personal,
            total_team_volume=total_team,
            personal_volume=personal_volume,
            team_volume=team_volume,
            user_kyc_status=user.admin_kyc_status,
            current_rank_id=user.current_rank_id,
            current_rank_sort_order=current_rank_sort,
            previous_rank_id=previous_rank_id,
            previous_target=Decimal("0"),
        )

    new_ranks_result = await db.execute(
        select(Rank)
        .where(
            Rank.is_active == True,
            Rank.sort_order > current_rank_sort,
            Rank.sort_order <= qualified_rank.sort_order,
        )
        .order_by(Rank.sort_order.asc())
    )
    new_ranks = list(new_ranks_result.scalars().all())
    if not new_ranks:
        return RankEvaluationData(
            total_personal_volume=total_personal,
            total_team_volume=total_team,
            personal_volume=personal_volume,
            team_volume=team_volume,
            user_kyc_status=user.admin_kyc_status,
            current_rank_id=user.current_rank_id,
            current_rank_sort_order=current_rank_sort,
            previous_rank_id=previous_rank_id,
            previous_target=Decimal("0"),
        )

    previous_target = Decimal("0")
    if previous_rank_id:
        prev_rank = await db.get(Rank, previous_rank_id)
        if prev_rank:
            previous_target = prev_rank.target_volume

    new_rank_ids = [r.id for r in new_ranks]
    config_rows = await db.execute(
        select(RankBonusConfig)
        .where(RankBonusConfig.rank_id.in_(new_rank_ids))
        .order_by(RankBonusConfig.sort_order)
    )
    bonus_map: dict[int, list[tuple[str, Decimal]]] = {}
    for c in config_rows.scalars().all():
        bonus_map.setdefault(c.rank_id, []).append((c.bonus_type, c.bonus_percent))

    return RankEvaluationData(
        total_personal_volume=total_personal,
        total_team_volume=total_team,
        personal_volume=personal_volume,
        team_volume=team_volume,
        user_kyc_status=user.admin_kyc_status,
        current_rank_id=user.current_rank_id,
        current_rank_sort_order=current_rank_sort,
        previous_rank_id=previous_rank_id,
        previous_target=previous_target,
        new_ranks=new_ranks,
        bonus_map=bonus_map,
    )


async def apply_rank_updates(
    user_id: int,
    db: AsyncSession,
    data: RankEvaluationData,
    *,
    source_user_id: int | None = None,
    reference_id: int | None = None,
    reference_type: str | None = None,
    skip_bonus: bool = False,
) -> dict:
    """Write phase: acquire FOR UPDATE lock and apply rank changes.

    Re-verifies critical conditions under lock to handle stale-data edge cases.
    """
    result = {"rank_upgraded": False, "bonuses_paid": [], "previous_rank": None, "new_rank": None}

    user_result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if not user:
        return result

    user.team_volume = data.total_team_volume

    if user.admin_kyc_status != "approved":
        return result

    if data.personal_volume <= 0:
        return result

    if data.new_ranks:
        current_sort = 0
        if user.current_rank_id:
            curr = await db.get(Rank, user.current_rank_id)
            if curr:
                current_sort = curr.sort_order
        if data.new_ranks[0].sort_order <= current_sort:
            return result

        previous_rank_id = data.previous_rank_id
        previous_target = data.previous_target
        team_volume = data.team_volume
        last_achieved_rank = None

        for rank in data.new_ranks:
            if await _has_rank_bonus_been_paid(user_id, rank.id, db):
                previous_target = rank.target_volume
                last_achieved_rank = rank
                continue

            eligible = (rank.target_volume - previous_target).quantize(
                WALLET_PRECISION, rounding=ROUND_HALF_UP
            )
            if eligible <= 0:
                previous_target = rank.target_volume
                last_achieved_rank = rank
                continue

            configs = data.bonus_map.get(rank.id, [])
            if not configs:
                previous_target = rank.target_volume
                last_achieved_rank = rank
                continue

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
                result["bonuses_paid"].append({
                    "rank_id": rank.id,
                    "rank_name": rank.name,
                    "eligible_amount": str(eligible),
                })

            await _create_rank_history(
                user_id=user_id,
                rank_id=rank.id,
                previous_rank_id=previous_rank_id,
                team_volume=team_volume,
                db=db,
            )

            previous_rank_id = rank.id
            previous_target = rank.target_volume
            last_achieved_rank = rank

        if last_achieved_rank:
            result["previous_rank"] = user.current_rank_id
            user.current_rank_id = last_achieved_rank.id
            result["new_rank"] = last_achieved_rank.id
            result["rank_upgraded"] = True

    return result


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
    """Compatibility wrapper — calls read-then-write in sequence."""
    data = await get_rank_evaluation_data(
        user_id=user_id,
        db=db,
        use_snapshot_volume=use_snapshot_volume,
        snapshot_volume=snapshot_volume,
        skip_bonus=skip_bonus,
    )
    if data is None:
        return {"rank_upgraded": False, "bonuses_paid": [], "previous_rank": None, "new_rank": None}

    return await apply_rank_updates(
        user_id=user_id,
        db=db,
        data=data,
        source_user_id=source_user_id,
        reference_id=reference_id,
        reference_type=reference_type,
        skip_bonus=skip_bonus,
    )
