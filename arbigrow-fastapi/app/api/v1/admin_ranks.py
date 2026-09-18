from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.rank import Rank
from app.models.rank_history import RankHistory
from app.models.matching_bonus import MatchingBonus
from app.models.rank_bonus_config import RankBonusConfig
from app.schemas.rank import (
    RankCreate,
    RankUpdate,
    RankResponse,
    RankHistoryResponse,
    MatchingBonusResponse,
)

router = APIRouter(prefix="/admin/ranks", tags=["Admin Ranks"])


@router.get("/", response_model=list[RankResponse])
async def list_ranks(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Rank).order_by(Rank.sort_order.asc())
    )
    return result.scalars().all()


@router.get("/distribution")
async def rank_distribution(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(
            Rank.id,
            Rank.name,
            Rank.slug,
            Rank.sort_order,
            func.count(User.id).label("user_count"),
        )
        .outerjoin(User, User.current_rank_id == Rank.id)
        .group_by(Rank.id, Rank.name, Rank.slug, Rank.sort_order)
        .order_by(Rank.sort_order.asc())
    )
    rows = result.all()
    total_users = sum(r.user_count for r in rows)
    return {
        "total_users": total_users,
        "ranks": [
            {
                "rank_id": r.id,
                "rank_name": r.name,
                "slug": r.slug,
                "sort_order": r.sort_order,
                "user_count": r.user_count,
                "percentage": round(r.user_count / total_users * 100, 2) if total_users > 0 else 0,
            }
            for r in rows
        ],
    }


@router.get("/{rank_id}", response_model=RankResponse)
async def get_rank(
    rank_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    rank = await db.get(Rank, rank_id)
    if not rank:
        raise HTTPException(status_code=404, detail="Rank not found")
    return rank


@router.post("/", response_model=RankResponse, status_code=201)
async def create_rank(
    payload: RankCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    existing = await db.execute(
        select(Rank).where(
            (Rank.name == payload.name) | (Rank.slug == payload.slug)
        )
    )
    if existing.first():
        raise HTTPException(
            status_code=400,
            detail="Rank with this name or slug already exists",
        )

    bonus_configs = payload.bonus_configs
    rank_data = payload.model_dump(exclude={"bonus_configs"})
    rank = Rank(**rank_data)
    db.add(rank)
    await db.flush()

    for i, bc in enumerate(bonus_configs):
        db.add(RankBonusConfig(
            rank_id=rank.id,
            bonus_type=bc.bonus_type,
            bonus_percent=bc.bonus_percent,
            sort_order=bc.sort_order or i,
        ))

    await db.commit()
    await db.refresh(rank)
    return rank


@router.put("/{rank_id}", response_model=RankResponse)
async def update_rank(
    rank_id: int,
    payload: RankUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    rank = await db.get(Rank, rank_id)
    if not rank:
        raise HTTPException(status_code=404, detail="Rank not found")

    bonus_configs = payload.bonus_configs
    update_data = payload.model_dump(exclude={"bonus_configs"}, exclude_unset=True)

    for field, value in update_data.items():
        setattr(rank, field, value)

    if bonus_configs is not None:
        await db.execute(
            delete(RankBonusConfig).where(RankBonusConfig.rank_id == rank.id)
        )
        for i, bc in enumerate(bonus_configs):
            db.add(RankBonusConfig(
                rank_id=rank.id,
                bonus_type=bc.bonus_type,
                bonus_percent=bc.bonus_percent,
                sort_order=bc.sort_order or i,
            ))

    await db.commit()
    await db.refresh(rank)
    return rank


@router.delete("/{rank_id}", status_code=204)
async def delete_rank(
    rank_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    rank = await db.get(Rank, rank_id)
    if not rank:
        raise HTTPException(status_code=404, detail="Rank not found")
    await db.delete(rank)
    await db.commit()


@router.get("/history/all", response_model=list[RankHistoryResponse])
async def list_all_rank_history(
    user_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    query = select(RankHistory).options(joinedload(RankHistory.user)).order_by(RankHistory.created_at.desc())
    if user_id:
        query = query.where(RankHistory.user_id == user_id)
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


<<<<<<< HEAD
@router.get("/bonuses/all")
=======
@router.get("/bonuses/all", response_model=list[MatchingBonusResponse])
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
async def list_all_matching_bonuses(
    user_id: int | None = Query(None),
    rank_id: int | None = Query(None),
    bonus_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
<<<<<<< HEAD
    # Single query with joins (no N+1): user + source_user + rank are all
    # eager-loaded for the identity/rank detail fields below.
    query = select(MatchingBonus).options(
        joinedload(MatchingBonus.user),
        joinedload(MatchingBonus.source_user),
        joinedload(MatchingBonus.rank),
    ).order_by(MatchingBonus.created_at.desc())
=======
    query = select(MatchingBonus).options(joinedload(MatchingBonus.user), joinedload(MatchingBonus.source_user)).order_by(MatchingBonus.created_at.desc())
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    if user_id:
        query = query.where(MatchingBonus.user_id == user_id)
    if rank_id:
        query = query.where(MatchingBonus.rank_id == rank_id)
    if bonus_type:
        query = query.where(MatchingBonus.bonus_type == bonus_type)
<<<<<<< HEAD
    query = query.where(MatchingBonus.is_reversed == False)
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    bonuses = result.scalars().all()
    return [
        {
            "id": b.id,
            "user_id": b.user_id,
            "user_no": b.user.user_no if b.user else None,
            "user_full_name": b.user.full_name if b.user else None,
            "user_username": b.user.username if b.user else None,
            "user_email": b.user.email if b.user else None,
            "source_user_id": b.source_user_id,
            "source_user_no": b.source_user.user_no if b.source_user else None,
            "source_full_name": b.source_user.full_name if b.source_user else None,
            "source_username": b.source_user.username if b.source_user else None,
            "rank_id": b.rank_id,
            "rank_name": b.rank.name if b.rank else None,
            "rank_target_volume": str(b.rank.target_volume) if b.rank and b.rank.target_volume is not None else None,
            "bonus_type": b.bonus_type,
            "eligible_amount": str(b.eligible_amount),
            "bonus_percent": str(b.bonus_percent),
            "bonus_amount": str(b.bonus_amount),
            "reference_id": b.reference_id,
            "reference_type": b.reference_type,
            "description": b.description,
            "status": "reversed" if b.is_reversed else "completed",
            "created_at": b.created_at.isoformat() if b.created_at else None,
        }
        for b in bonuses
    ]
=======
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
