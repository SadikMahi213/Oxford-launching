from decimal import Decimal
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func, text as sa_text

from app.core.database import get_db
from app.core.rate_limiter import limiter
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.kyc import KYC
from app.models.matching_bonus import MatchingBonus
from app.models.deposit import Deposit
from app.models.investments import Investment
from app.models.referral_profit_history import ReferralProfitHistory

router = APIRouter(prefix="/user", tags=["User Network"])


@router.get("/network-analytics")
@limiter.limit("60/minute")
async def get_network_analytics(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get all descendants via recursive CTE
    team_stmt = sa_text("""
        WITH RECURSIVE team_tree AS (
            SELECT id, 1 AS depth FROM users WHERE parent_lvl_1_id = :uid
            UNION ALL
            SELECT u.id, tt.depth + 1 FROM users u
            INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
            WHERE tt.depth < :max_depth
        )
        SELECT id FROM team_tree
    """)
    team_rows = await db.execute(team_stmt, {"uid": current_user.id, "max_depth": 999})
    team_ids = [row[0] for row in team_rows.fetchall()]

    total_network_members = len(team_ids)

    if not team_ids:
        return {
            "total_network_members": 0,
            "active_members": 0,
            "inactive_members": 0,
        }

    # Active = KYC status approved + email verified
    kyc_result = await db.execute(
        select(KYC.user_id).where(
            KYC.user_id.in_(team_ids),
            KYC.status == "approved",
        )
    )
    kyc_approved_ids = {row[0] for row in kyc_result.all()}

    user_result = await db.execute(
        select(User.id, User.email_verified).where(User.id.in_(team_ids))
    )
    active_ids = 0
    for uid, email_verified in user_result.all():
        if email_verified and uid in kyc_approved_ids:
            active_ids += 1

    inactive = total_network_members - active_ids

    return {
        "total_network_members": total_network_members,
        "active_members": active_ids,
        "inactive_members": inactive,
    }


@router.get("/level-analytics/{level}")
@limiter.limit("60/minute")
async def get_level_analytics(
    request: Request,
    level: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if level < 1 or level > 5:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Level must be between 1 and 5")

    # Get team members at this specific depth
    team_stmt = sa_text("""
        WITH RECURSIVE team_tree AS (
            SELECT id, 1 AS depth FROM users WHERE parent_lvl_1_id = :uid
            UNION ALL
            SELECT u.id, tt.depth + 1 FROM users u
            INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
            WHERE tt.depth < :max_depth
        )
        SELECT id, depth FROM team_tree WHERE depth = :lvl
    """)
    team_rows = await db.execute(team_stmt, {"uid": current_user.id, "lvl": level, "max_depth": 999})
    team_data = team_rows.fetchall()
    team_ids = [row[0] for row in team_data]

    if not team_ids:
        return {
            "level": level,
            "total_members": 0,
            "total_deposit_volume": "0",
            "total_investment_volume": "0",
            "total_commission_earned": "0",
            "members": [],
        }

    # Total deposit volume
    deposit_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Deposit.amount), 0))
        .where(Deposit.user_id.in_(team_ids), Deposit.status == "approved")
    )
    total_deposit_volume = Decimal(str(deposit_result.scalar()))

    # Total investment volume
    inv_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Investment.invested_amount), 0))
        .where(Investment.user_id.in_(team_ids), Investment.status == "active")
    )
    total_investment_volume = Decimal(str(inv_result.scalar()))

    # Total commission earned by these members
    commission_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(ReferralProfitHistory.amount), 0))
        .where(ReferralProfitHistory.receiver_user_id.in_(team_ids))
    )
    total_commission_earned = Decimal(str(commission_result.scalar()))

    # Member details
    users_result = await db.execute(
        select(User).where(User.id.in_(team_ids))
    )
    users = users_result.scalars().all()

    # Check KYC for active status
    kyc_result = await db.execute(
        select(KYC.user_id).where(
            KYC.user_id.in_(team_ids),
            KYC.status == "approved",
        )
    )
    kyc_ids = {row[0] for row in kyc_result.all()}

    members = []
    for u in users:
        member_earnings = (u.referral_wallet or Decimal("0")) + (u.generation_wallet or Decimal("0"))
        members.append({
            "user_no": u.user_no,
            "name": u.full_name,
            "username": u.username,
            "join_date": u.created_at.strftime("%b %d, %Y") if u.created_at else "",
            "total_earnings": str(member_earnings),
            "status": "active" if u.id in kyc_ids else "inactive",
        })

    return {
        "level": level,
        "total_members": len(team_ids),
        "total_deposit_volume": str(total_deposit_volume),
        "total_investment_volume": str(total_investment_volume),
        "total_commission_earned": str(total_commission_earned),
        "members": members,
    }


@router.get("/matching-wallet")
@limiter.limit("60/minute")
async def get_matching_wallet(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return {
        "total_matching_bonus": str(float(current_user.matching_bonus_wallet or Decimal("0"))),
    }
