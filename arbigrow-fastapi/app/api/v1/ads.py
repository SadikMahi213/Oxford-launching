import random
from datetime import datetime, date, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from app.models.investments import Investment
from app.models.ad_view import AdView
from app.models.ad import Ad
from app.models.user_ad_view import UserAdView
from app.models.package import TaskType
from app.schemas.captcha import CaptchaStatsResponse
from app.core.rate_limiter import limiter
from app.api.v1.deps import check_earning_access_by_id
from app.services.b2_service import generate_presigned_url

router = APIRouter(prefix="/ads", tags=["Ads"])

WALLET_PRECISION = Decimal("0.00000000000001")


def _resolve_thumbnail_url(stored: str | None) -> str | None:
    if not stored:
        return None
    if stored.startswith("http://") or stored.startswith("https://"):
        return stored
    return generate_presigned_url(stored, expires_in=604800)


def _get_ad_investment(investments: list[Investment]) -> Investment | None:
    for inv in investments:
        if inv.package_name and True:
            return inv
    return investments[0] if investments else None


@router.get("/start")
@limiter.limit("12/minute")
async def start_ad(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await check_earning_access_by_id(user_id, db)
    inv_result = await db.execute(
        select(Investment).where(
            and_(
                Investment.user_id == user_id,
                Investment.status == "active",
            )
        ).order_by(Investment.id.desc())
    )
    all_investments = inv_result.scalars().all()
    if not all_investments:
        raise HTTPException(400, detail="No active investment package found. Purchase a package first.")

    from app.models.package import Package
    ad_investments = []
    for inv in all_investments:
        pkg_result = await db.execute(select(Package).where(Package.name == inv.package_name))
        pkg = pkg_result.scalar_one_or_none()
        if pkg and pkg.task_type == TaskType.ad_view:
            ad_investments.append((inv, pkg))
    if not ad_investments:
        raise HTTPException(400, detail="Your active package does not support ad view tasks.")

    investment, package = ad_investments[0]

    today = date.today()
    for inv, _ in ad_investments:
        if inv.last_captcha_date is None or inv.last_captcha_date < today:
            inv.captchas_typed_today = 0
            inv.last_captcha_date = today

    total_typed = sum(inv.captchas_typed_today or 0 for inv, _ in ad_investments)
    total_limit = sum(pkg.daily_captcha_limit or 0 for _, pkg in ad_investments)

    if total_typed >= total_limit:
        raise HTTPException(400, detail="Daily ad view limit reached. Come back tomorrow.")

    existing = await db.execute(
        select(AdView).where(
            and_(
                AdView.user_id == user_id,
                AdView.is_completed == False,
            )
        )
    )
    active_session = existing.scalars().first()
    if active_session:
        ad_info = None
        if active_session.ad_id:
            ad_result = await db.execute(select(Ad).where(Ad.id == active_session.ad_id))
            ad_info = ad_result.scalar_one_or_none()
        return {
            "ad_view_id": active_session.id,
            "ad_id": active_session.ad_id,
            "video_id": ad_info.video_id if ad_info else None,
            "title": ad_info.title if ad_info else None,
            "thumbnail": _resolve_thumbnail_url(ad_info.thumbnail) if ad_info else None,
            "duration_seconds": package.ad_duration_seconds,
            "required_watch_seconds": ad_info.required_watch_seconds if ad_info else package.ad_duration_seconds,
            "started_at": active_session.started_at.isoformat(),
        }

    all_ads_result = await db.execute(
        select(Ad).where(
            and_(
                Ad.is_active == True,
            )
        ).order_by(func.random())
    )
    all_ads = all_ads_result.scalars().all()
    if not all_ads:
        raise HTTPException(400, detail="No ads available. Please check back later.")

    selected_ad = all_ads[0] if len(all_ads) == 1 else random.choice(all_ads)

    ad_view = AdView(
        user_id=user_id,
        ad_id=selected_ad.id,
        started_at=datetime.now(timezone.utc),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", ""),
    )
    db.add(ad_view)
    await db.commit()
    await db.refresh(ad_view)

    return {
        "ad_view_id": ad_view.id,
        "ad_id": selected_ad.id,
        "video_id": selected_ad.video_id,
        "title": selected_ad.title,
        "thumbnail": _resolve_thumbnail_url(selected_ad.thumbnail),
        "duration_seconds": package.ad_duration_seconds,
        "required_watch_seconds": selected_ad.required_watch_seconds,
        "started_at": ad_view.started_at.isoformat(),
    }


@router.post("/complete")
@limiter.limit("12/minute")
async def complete_ad(
    request: Request,
    ad_view_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await check_earning_access_by_id(user_id, db)
    result = await db.execute(
        select(AdView).where(
            and_(
                AdView.id == ad_view_id,
                AdView.user_id == user_id,
            )
        )
    )
    ad_view = result.scalars().first()
    if not ad_view:
        raise HTTPException(404, detail="Ad view session not found")
    if ad_view.is_completed:
        raise HTTPException(400, detail="Ad already completed")

    now = datetime.now(timezone.utc)
    elapsed = (now - ad_view.started_at).total_seconds()
    # Determine required watch time from the actual ad or package
    required_seconds = 30  # fallback default
    if ad_view.ad_id:
        ad_result = await db.execute(select(Ad).where(Ad.id == ad_view.ad_id))
        ad = ad_result.scalar_one_or_none()
        if ad and ad.required_watch_seconds:
            required_seconds = ad.required_watch_seconds
    if elapsed < required_seconds:
        raise HTTPException(400, detail=f"Please watch at least {required_seconds} seconds of the ad.")

    user_result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")

    inv_result = await db.execute(
        select(Investment).where(
            and_(
                Investment.user_id == user_id,
                Investment.status == "active",
            )
        ).order_by(Investment.id.desc())
    )
    all_investments = inv_result.scalars().all()
    if not all_investments:
        raise HTTPException(400, detail="No active investment")

    from app.models.package import Package
    ad_investments = []
    for inv in all_investments:
        pkg_result = await db.execute(select(Package).where(Package.name == inv.package_name))
        pkg = pkg_result.scalar_one_or_none()
        if pkg and pkg.task_type == TaskType.ad_view:
            ad_investments.append((inv, pkg))
    if not ad_investments:
        raise HTTPException(400, detail="Your active package does not support ad view tasks.")

    today = date.today()
    for inv, _ in ad_investments:
        if inv.last_captcha_date is None or inv.last_captcha_date < today:
            inv.captchas_typed_today = 0
            inv.last_captcha_date = today

    total_typed = sum(inv.captchas_typed_today or 0 for inv, _ in ad_investments)
    total_limit = sum(pkg.daily_captcha_limit or 0 for _, pkg in ad_investments)
    if total_typed >= total_limit:
        raise HTTPException(400, detail="Daily ad view limit reached")

    earned = (ad_investments[0][1].earn_per_captcha or Decimal("0")).quantize(
        WALLET_PRECISION, rounding=ROUND_HALF_UP
    )
    user.ad_view_wallet = (user.ad_view_wallet + earned).quantize(
        WALLET_PRECISION, rounding=ROUND_HALF_UP
    )

    ad_investments[0][0].captchas_typed_today = (ad_investments[0][0].captchas_typed_today or 0) + 1

    ad_view.is_completed = True
    ad_view.completed_at = now
    ad_view.amount_earned = earned

    if ad_view.ad_id:
        uav_result = await db.execute(
            select(UserAdView).where(
                and_(
                    UserAdView.user_id == user_id,
                    UserAdView.ad_id == ad_view.ad_id,
                )
            )
        )
        uav = uav_result.scalar_one_or_none()
        if uav:
            uav.view_count = (uav.view_count or 0) + 1
            uav.total_rewarded = (uav.total_rewarded + earned).quantize(
                WALLET_PRECISION, rounding=ROUND_HALF_UP
            )
            uav.last_viewed_at = now
        else:
            uav = UserAdView(
                user_id=user_id,
                ad_id=ad_view.ad_id,
                view_count=1,
                total_rewarded=earned,
                last_viewed_at=now,
            )
            db.add(uav)

    remaining = total_limit - sum(inv.captchas_typed_today or 0 for inv, _ in ad_investments)

    await db.commit()
    await db.refresh(user)

    return {
        "success": True,
        "earned": earned,
        "remaining_today": remaining,
        "new_balance": user.ad_view_wallet,
    }


@router.get("/stats", response_model=CaptchaStatsResponse)
@limiter.limit("30/minute")
async def get_ad_stats(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    inv_result = await db.execute(
        select(Investment).where(
            and_(
                Investment.user_id == user_id,
                Investment.status == "active",
            )
        ).order_by(Investment.id.desc())
    )
    all_investments = inv_result.scalars().all()

    zero_stats = CaptchaStatsResponse(
        earn_per_captcha=Decimal("0"),
        daily_limit=0,
        typed_today=0,
        remaining=0,
        total_earned_today=Decimal("0"),
        total_earned_all=Decimal("0"),
    )

    if not all_investments:
        return zero_stats

    from app.models.package import Package
    ad_investments = []
    for inv in all_investments:
        pkg_result = await db.execute(select(Package).where(Package.name == inv.package_name))
        pkg = pkg_result.scalar_one_or_none()
        if pkg and pkg.task_type == TaskType.ad_view:
            ad_investments.append((inv, pkg))
    if not ad_investments:
        return zero_stats

    today = date.today()
    for inv in all_investments:
        if inv.last_captcha_date is None or inv.last_captcha_date < today:
            inv.captchas_typed_today = 0
            inv.last_captcha_date = today

    today_result = await db.execute(
        select(func.coalesce(func.sum(AdView.amount_earned), 0)).where(
            and_(
                AdView.user_id == user_id,
                AdView.is_completed == True,
                func.date(AdView.completed_at) == today,
            )
        )
    )
    total_earned_today = today_result.scalar() or Decimal("0")

    all_result = await db.execute(
        select(func.coalesce(func.sum(AdView.amount_earned), 0)).where(
            and_(
                AdView.user_id == user_id,
                AdView.is_completed == True,
            )
        )
    )
    total_earned_all = all_result.scalar() or Decimal("0")

    daily_limit = sum(pkg.daily_captcha_limit or 0 for _, pkg in ad_investments)
    typed_today = sum(inv.captchas_typed_today or 0 for inv, _ in ad_investments)
    remaining = max(0, daily_limit - typed_today)

    return CaptchaStatsResponse(
        earn_per_captcha=ad_investments[0][1].earn_per_captcha or Decimal("0"),
        daily_limit=daily_limit,
        typed_today=typed_today,
        remaining=remaining,
        total_earned_today=total_earned_today,
        total_earned_all=total_earned_all,
    )


@router.get("/my-history")
@limiter.limit("60/minute")
async def get_my_ad_history(
    request: Request,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(AdView)
        .where(AdView.user_id == user_id)
        .order_by(AdView.started_at.desc())
        .limit(limit)
    )
    views = result.scalars().all()
    return {
        "data": [
            {
                "id": v.id,
                "amount_earned": float(v.amount_earned),
                "is_completed": v.is_completed,
                "started_at": v.started_at.isoformat(),
                "completed_at": v.completed_at.isoformat() if v.completed_at else None,
            }
            for v in views
        ]
    }
