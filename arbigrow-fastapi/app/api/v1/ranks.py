from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.rank import Rank
from app.models.rank_history import RankHistory
from app.models.matching_bonus import MatchingBonus
from app.models.deposit import Deposit
from app.schemas.rank import (
    RankResponse,
    RankHistoryResponse,
    MatchingBonusResponse,
)
from decimal import Decimal

router = APIRouter(prefix="/ranks", tags=["Ranks"])


@router.get("/", response_model=list[RankResponse])
async def list_active_ranks(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Rank)
        .where(Rank.is_active == True)
        .order_by(Rank.sort_order.asc())
    )
    return result.scalars().all()


@router.get("/my-rank")
async def get_my_rank(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current user's rank info and next rank target."""
    current_rank = None
    if current_user.current_rank_id:
        current_rank = await db.get(Rank, current_user.current_rank_id)

    next_rank_result = await db.execute(
        select(Rank)
        .where(
            Rank.is_active == True,
            Rank.target_volume > (current_user.team_volume or 0),
        )
        .order_by(Rank.sort_order.asc())
        .limit(1)
    )
    next_rank = next_rank_result.scalar_one_or_none()

    # Compute user's own approved deposits
    personal_result = await db.execute(
        select(func.coalesce(func.sum(Deposit.amount), 0))
        .where(Deposit.user_id == current_user.id, Deposit.status == "approved")
    )
    personal_volume = Decimal(str(personal_result.scalar()))

    # Compute total matching bonus earned
    total_result = await db.execute(
        select(func.coalesce(func.sum(MatchingBonus.bonus_amount), 0))
        .where(MatchingBonus.user_id == current_user.id)
    )
    total_matching_bonus = total_result.scalar() or Decimal("0")

    team_volume = current_user.team_volume or Decimal("0")
    next_target = next_rank.target_volume if next_rank else Decimal("0")

    return {
        "user_no": current_user.user_no,
        "current_rank": RankResponse.model_validate(current_rank) if current_rank else None,
        "next_rank": RankResponse.model_validate(next_rank) if next_rank else None,
        "personal_volume": str(personal_volume),
        "team_volume": str(team_volume),
        "total_matching_bonus_earned": str(total_matching_bonus),
        "remaining_volume": str(max(Decimal("0"), next_target - team_volume)),
        "next_target_volume": str(next_target),
        "progress": (
            float(team_volume) / float(next_target) * 100
            if next_rank and next_target > 0
            else 100.0
        ),
    }


@router.get("/my-history", response_model=list[RankHistoryResponse])
async def get_my_rank_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RankHistory)
        .options(joinedload(RankHistory.user))
        .where(RankHistory.user_id == current_user.id)
        .order_by(RankHistory.created_at.desc())
    )
    return result.scalars().all()


@router.get("/my-bonuses", response_model=list[MatchingBonusResponse])
async def get_my_matching_bonuses(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MatchingBonus)
        .options(joinedload(MatchingBonus.user), joinedload(MatchingBonus.source_user))
        .where(MatchingBonus.user_id == current_user.id)
        .order_by(MatchingBonus.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return result.scalars().all()
