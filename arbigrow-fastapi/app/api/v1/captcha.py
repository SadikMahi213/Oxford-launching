import hashlib
import secrets
import string
from datetime import datetime, timedelta, date, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from app.models.investments import Investment
from app.models.captcha import CaptchaChallenge, CaptchaEarning
from app.schemas.captcha import (
    CaptchaNextResponse,
    CaptchaSubmitRequest,
    CaptchaSubmitResponse,
    CaptchaStatsResponse,
)
from app.core.rate_limiter import limiter
from app.services.captcha_generator import generate_captcha_image
from app.models.package import Package, TaskType

router = APIRouter(prefix="/captcha", tags=["Captcha"])

CAPTCHA_EXPIRY_MINUTES = 2
CAPTCHA_RATE_LIMIT_SECONDS = 5
WALLET_PRECISION = Decimal("0.00000000000001")


def _generate_captcha_text(length: int = 5) -> str:
    chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(chars) for _ in range(length))


def _hash_captcha(text: str, salt: str) -> str:
    return hashlib.sha256((text + salt).encode()).hexdigest()


def _reset_daily_counter_if_needed(investment: Investment, today: date):
    if investment.last_captcha_date is None or investment.last_captcha_date < today:
        investment.captchas_typed_today = 0
        investment.last_captcha_date = today


@router.get("/next", response_model=CaptchaNextResponse)
@limiter.limit("12/minute")
async def get_next_captcha(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Investment).where(
            and_(
                Investment.user_id == user_id,
                Investment.status == "active",
            )
        ).order_by(Investment.id.desc())
    )
    investment = result.scalars().first()
    if not investment:
        raise HTTPException(400, detail="No active investment package found. Purchase a package first.")

    pkg_result = await db.execute(select(Package).where(Package.name == investment.package_name))
    package = pkg_result.scalar_one_or_none()
    if not package or package.task_type != TaskType.captcha:
        raise HTTPException(400, detail="Your active package does not support captcha tasks.")

    today = date.today()
    _reset_daily_counter_if_needed(investment, today)

    if investment.captchas_typed_today >= (investment.daily_captcha_limit or 0):
        raise HTTPException(400, detail="Daily captcha limit reached. Come back tomorrow.")

    captcha_text = _generate_captcha_text()
    salt = secrets.token_hex(8)
    text_hash = _hash_captcha(captcha_text, salt)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CAPTCHA_EXPIRY_MINUTES)

    challenge = CaptchaChallenge(
        user_id=user_id,
        captcha_text_hash=text_hash,
        salt=salt,
        expires_at=expires_at,
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    captcha_image = generate_captcha_image(captcha_text)

    return CaptchaNextResponse(
        captcha_id=challenge.id,
        captcha_image=captcha_image,
        expires_at=expires_at,
    )


@router.post("/submit", response_model=CaptchaSubmitResponse)
@limiter.limit("12/minute")
async def submit_captcha(
    request: Request,
    body: CaptchaSubmitRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CaptchaChallenge).where(
            and_(
                CaptchaChallenge.id == body.captcha_id,
                CaptchaChallenge.user_id == user_id,
            )
        )
    )
    challenge = result.scalars().first()
    if not challenge:
        raise HTTPException(404, detail="Captcha not found")
    if challenge.is_used:
        raise HTTPException(400, detail="Captcha already used")
    if datetime.now(timezone.utc) > challenge.expires_at:
        challenge.is_used = True
        await db.commit()
        raise HTTPException(400, detail="Captcha expired")

    user_result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")

    investment_result = await db.execute(
        select(Investment).where(
            and_(
                Investment.user_id == user_id,
                Investment.status == "active",
            )
        ).order_by(Investment.id.desc())
    )
    investment = investment_result.scalars().first()
    if not investment:
        raise HTTPException(400, detail="No active investment")

    pkg_result = await db.execute(select(Package).where(Package.name == investment.package_name))
    package = pkg_result.scalar_one_or_none()
    if not package or package.task_type != TaskType.captcha:
        raise HTTPException(400, detail="Your active package does not support captcha tasks.")

    today = date.today()
    _reset_daily_counter_if_needed(investment, today)

    expected_hash = _hash_captcha(body.user_input.strip().upper(), challenge.salt)
    is_correct = expected_hash == challenge.captcha_text_hash

    challenge.is_used = True

    earning = CaptchaEarning(
        user_id=user_id,
        captcha_text_original=challenge.captcha_text_hash,
        user_input=body.user_input.strip().upper(),
        is_correct=is_correct,
        amount_earned=Decimal("0"),
    )

    remaining_today = (investment.daily_captcha_limit or 0) - investment.captchas_typed_today
    earned = Decimal("0")

    if is_correct:
        earned = (investment.earn_per_captcha or Decimal("0")).quantize(
            WALLET_PRECISION, rounding=ROUND_HALF_UP
        )
        user.main_wallet = (user.main_wallet + earned).quantize(
            WALLET_PRECISION, rounding=ROUND_HALF_UP
        )
        investment.captchas_typed_today += 1
        earning.amount_earned = earned
        remaining_today = (investment.daily_captcha_limit or 0) - investment.captchas_typed_today

    db.add(earning)
    await db.commit()
    await db.refresh(user)

    return CaptchaSubmitResponse(
        success=is_correct,
        earned=earned,
        remaining_today=remaining_today,
        new_balance=user.main_wallet,
    )


@router.get("/stats", response_model=CaptchaStatsResponse)
@limiter.limit("30/minute")
async def get_captcha_stats(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Investment).where(
            and_(
                Investment.user_id == user_id,
                Investment.status == "active",
            )
        ).order_by(Investment.id.desc())
    )
    investment = result.scalars().first()

    if not investment:
        return CaptchaStatsResponse(
            earn_per_captcha=Decimal("0"),
            daily_limit=0,
            typed_today=0,
            remaining=0,
            total_earned_today=Decimal("0"),
            total_earned_all=Decimal("0"),
        )

    pkg_result = await db.execute(select(Package).where(Package.name == investment.package_name))
    package = pkg_result.scalar_one_or_none()
    if not package or package.task_type != TaskType.captcha:
        return CaptchaStatsResponse(
            earn_per_captcha=Decimal("0"),
            daily_limit=0,
            typed_today=0,
            remaining=0,
            total_earned_today=Decimal("0"),
            total_earned_all=Decimal("0"),
        )

    today = date.today()
    _reset_daily_counter_if_needed(investment, today)

    today_result = await db.execute(
        select(func.coalesce(func.sum(CaptchaEarning.amount_earned), 0)).where(
            and_(
                CaptchaEarning.user_id == user_id,
                CaptchaEarning.is_correct == True,
                func.date(CaptchaEarning.created_at) == today,
            )
        )
    )
    total_earned_today = today_result.scalar() or Decimal("0")

    all_result = await db.execute(
        select(func.coalesce(func.sum(CaptchaEarning.amount_earned), 0)).where(
            and_(
                CaptchaEarning.user_id == user_id,
                CaptchaEarning.is_correct == True,
            )
        )
    )
    total_earned_all = all_result.scalar() or Decimal("0")

    daily_limit = investment.daily_captcha_limit or 0
    typed_today = investment.captchas_typed_today or 0
    remaining = max(0, daily_limit - typed_today)

    return CaptchaStatsResponse(
        earn_per_captcha=investment.earn_per_captcha or Decimal("0"),
        daily_limit=daily_limit,
        typed_today=typed_today,
        remaining=remaining,
        total_earned_today=total_earned_today,
        total_earned_all=total_earned_all,
    )
