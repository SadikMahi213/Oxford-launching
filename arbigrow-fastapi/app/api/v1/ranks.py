from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import cast, select, func, Numeric
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
    """Return the current user's rank info and next rank target.

    Team Volume (own deposit + up to 10 generations of descendants) ALWAYS
    accumulates and is reported regardless of KYC status. A user whose KYC is
    not approved still sees their accumulated volume but never a rank: no
    volume is eligible for rank assignment or matching bonuses until approval.
    """
    from app.services.rank_service import get_team_volume, _get_highest_qualified_rank
    from app.utils.kyc_helper import is_kyc_approved

    # Lifetime Team Volume = own approved deposits + up to 10 generations of
    # descendants. It always accumulates and is the value the UI reports.
    personal_volume, team_volume = await get_team_volume(current_user.id, db)

    if not await is_kyc_approved(current_user, db):
        return {
            "user_no": current_user.user_no,
            "current_rank": None,
            "next_rank": None,
            "personal_volume": str(personal_volume),
            "network_volume": str(max(Decimal("0"), team_volume - personal_volume)),
            "team_volume": str(team_volume),
            "kyc_approved_team_volume": None,
            "post_kyc_team_volume": None,
            "total_matching_bonus_earned": "0",
            "remaining_volume": "0",
            "next_target_volume": "0",
            "progress": 0.0,
            "kyc_required": True,
        }

    # Rank and dashboard values are based on lifetime Team Volume. The frozen
    # KYC snapshot excludes historical volume from matching bonuses only; it
    # must not alter rank calculation or the volume shown to the user.
    current_user.team_volume = team_volume
    await db.commit()

    current_rank = await _get_highest_qualified_rank(team_volume, db)
    if not current_rank:
        current_rank = await db.get(Rank, current_user.current_rank_id)

    next_rank_result = await db.execute(
        select(Rank)
        .where(
            Rank.is_active == True,
            Rank.target_volume > cast(team_volume, Numeric),
        )
        .order_by(Rank.sort_order.asc())
        .limit(1)
    )
    next_rank = next_rank_result.scalar_one_or_none()

    # Compute total matching bonus earned
    total_result = await db.execute(
        select(func.coalesce(func.sum(MatchingBonus.bonus_amount), 0))
        .where(
            MatchingBonus.user_id == current_user.id,
            MatchingBonus.is_reversed == False,
        )
    )
    total_matching_bonus = total_result.scalar() or Decimal("0")
    next_target = next_rank.target_volume if next_rank else Decimal("0")
    network_volume = max(Decimal("0"), team_volume - personal_volume)

    def _serialize_rank(r):
        if not r:
            return None
        return {
            "id": r.id,
            "name": r.name,
            "slug": r.slug,
            "sort_order": r.sort_order,
            "target_volume": str(r.target_volume),
            "max_matching_percent": str(r.max_matching_percent),
            "is_active": r.is_active,
            "description": r.description,
            "bonus_configs": [
                {
                    "id": bc.id,
                    "rank_id": bc.rank_id,
                    "bonus_type": bc.bonus_type,
                    "bonus_percent": str(bc.bonus_percent),
                    "sort_order": bc.sort_order,
                    "created_at": bc.created_at.isoformat() if bc.created_at else None,
                }
                for bc in (r.bonus_configs or [])
            ],
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }

    # KYC snapshot info
    snapshot_volume = current_user.kyc_approved_team_volume
    post_kyc_volume = max(
        Decimal("0"), team_volume - snapshot_volume
    ) if snapshot_volume is not None else None

    return {
        "user_no": current_user.user_no,
        "current_rank": _serialize_rank(current_rank),
        "next_rank": _serialize_rank(next_rank),
        "personal_volume": str(personal_volume),
        "network_volume": str(network_volume),
        "team_volume": str(team_volume),
        "kyc_approved_team_volume": str(snapshot_volume) if snapshot_volume is not None else None,
        "post_kyc_team_volume": str(post_kyc_volume) if post_kyc_volume is not None else None,
        "total_matching_bonus_earned": str(total_matching_bonus),
        "remaining_volume": str(max(0, next_target - team_volume)),
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
    from app.utils.kyc_helper import is_kyc_approved

    if not await is_kyc_approved(current_user, db):
        return []
    result = await db.execute(
        select(RankHistory)
        .options(joinedload(RankHistory.user))
        .where(
            RankHistory.user_id == current_user.id,
            RankHistory.status != "reversed",
        )
        .order_by(RankHistory.created_at.desc())
    )
    return result.scalars().all()


@router.get("/my-bonuses")
async def get_my_matching_bonuses(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.utils.kyc_helper import is_kyc_approved

    if not await is_kyc_approved(current_user, db):
        return []
    result = await db.execute(
        select(MatchingBonus)
        .options(joinedload(MatchingBonus.user), joinedload(MatchingBonus.source_user), joinedload(MatchingBonus.rank))
        .where(
            MatchingBonus.user_id == current_user.id,
            MatchingBonus.is_reversed == False,
        )
        .order_by(MatchingBonus.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    bonuses = result.scalars().all()
    return [
        {
            "id": b.id,
            "user_id": b.user_id,
            "user_no": b.user.user_no if b.user else None,
            "source_user_id": b.source_user_id,
            "source_user_no": b.source_user.user_no if b.source_user else None,
            "rank_id": b.rank_id,
            "bonus_type": b.bonus_type,
            "eligible_amount": str(b.eligible_amount),
            "bonus_percent": str(b.bonus_percent),
            "bonus_amount": str(b.bonus_amount),
            "reference_id": b.reference_id,
            "reference_type": b.reference_type,
            "description": b.description,
            "is_reversed": b.is_reversed,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "rank_name": b.rank.name if b.rank else None,
        }
        for b in bonuses
    ]
