from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.rank import Rank
from app.models.rank_history import RankHistory
from app.models.matching_bonus import MatchingBonus
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

    rank = Rank(**payload.model_dump())
    db.add(rank)
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

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rank, field, value)

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
    query = select(RankHistory).order_by(RankHistory.created_at.desc())
    if user_id:
        query = query.where(RankHistory.user_id == user_id)
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/bonuses/all", response_model=list[MatchingBonusResponse])
async def list_all_matching_bonuses(
    user_id: int | None = Query(None),
    rank_id: int | None = Query(None),
    bonus_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    query = select(MatchingBonus).order_by(MatchingBonus.created_at.desc())
    if user_id:
        query = query.where(MatchingBonus.user_id == user_id)
    if rank_id:
        query = query.where(MatchingBonus.rank_id == rank_id)
    if bonus_type:
        query = query.where(MatchingBonus.bonus_type == bonus_type)
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
