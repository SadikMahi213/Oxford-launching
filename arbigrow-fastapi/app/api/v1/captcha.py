import hashlib
import random
import secrets
from datetime import datetime, timedelta, date, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.system_config import SystemConfig
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
from app.api.v1.deps import check_earning_access_by_id
from app.services.captcha_generator import generate_captcha_image
from app.models.package import Package, TaskType
from app.services.task_error_service import (
    log_task_attempt,
    log_task_error,
    check_task_access,
    ERR_CAPTCHA_INCORRECT,
    ERR_CAPTCHA_TIMEOUT,
    ERR_CAPTCHA_DUPLICATE,
    ERR_CAPTCHA_RAPID_SUBMISSION,
)

router = APIRouter(prefix="/captcha", tags=["Captcha"])

CAPTCHA_EXPIRY_MINUTES = 2
CAPTCHA_RATE_LIMIT_SECONDS = 5
WALLET_PRECISION = Decimal("0.00000000000001")

# Controlled, unambiguous alphanumeric charset.
# Validation stays case-insensitive (input is uppercased before comparing),
# and characters that are easily confused (O/0, I/1/l, S/5, B/8) are excluded
# in both cases.
CAPTCHA_CHARSET = "ACDEFGHJKLMNPQRTUVWXYZ234679"
# Lowercase extension for mixed-case challenges. Excludes the lowercase
# counterparts of the ambiguous pairs above: l (I/1), o (O/0), s (S/5),
# b (B/8).
CAPTCHA_LOWERCASE = "acdefghjkmnpqrtuvwxyz"


async def _get_captcha_timer_seconds(db, package: Package = None) -> int:
    if package and package.captcha_task_duration_seconds:
        try:
            return max(5, min(300, int(package.captcha_task_duration_seconds)))
        except (ValueError, TypeError):
            pass
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "captcha_timer_seconds")
    )
    row = result.scalar_one_or_none()
    if row and row.value:
        try:
            return max(5, min(300, int(row.value)))
        except (ValueError, TypeError):
            pass
    return 60


def _generate_captcha_text(length: int = 6) -> str:
    chars = [secrets.choice(CAPTCHA_CHARSET) for _ in range(length)]
    # Guarantee a realistic mix: at least one lowercase and at least one
    # uppercase letter (digits alone satisfy neither case requirement).
    uppers = "".join(c for c in CAPTCHA_CHARSET if c.isalpha())
    positions = random.sample(range(length), k=min(2, length))
    chars[positions[0]] = secrets.choice(CAPTCHA_LOWERCASE)
    if length >= 2:
        chars[positions[1]] = secrets.choice(uppers)
    return "".join(chars)


def _normalize_captcha_input(value: str) -> str:
    """Trim whitespace and normalize case before comparing.

    Generated captchas are uppercase-only, so uppercasing user input makes
    validation case-insensitive without weakening it.
    """
    return (value or "").strip().upper()


def _hash_captcha(text: str, salt: str) -> str:
    return hashlib.sha256((text + salt).encode()).hexdigest()


def _reset_daily_counter_if_needed(investment: Investment, today: date):
    if investment.last_captcha_date is None or investment.last_captcha_date < today:
        investment.captchas_typed_today = 0
        investment.captchas_expired_today = 0
        investment.last_captcha_date = today


async def _get_active_captcha_investment(db, user_id: int):
    """Return the user's active captcha investment, or None.

    Same package-eligibility rule as the other endpoints; raises nothing,
    so timeout/validation paths can use it without changing their errors.
    """
    inv_result = await db.execute(
        select(Investment).where(
            and_(
                Investment.user_id == user_id,
                Investment.status == "active",
            )
        ).order_by(Investment.id.desc())
    )
    for inv in inv_result.scalars().all():
        pkg_result = await db.execute(select(Package).where(Package.name == inv.package_name))
        pkg = pkg_result.scalar_one_or_none()
        if pkg and pkg.is_active and pkg.task_type == TaskType.captcha:
            return inv
    return None


@router.get("/next", response_model=CaptchaNextResponse)
@limiter.limit("12/minute")
async def get_next_captcha(
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

    investment = None
    for inv in all_investments:
        pkg_result = await db.execute(select(Package).where(Package.name == inv.package_name))
        pkg = pkg_result.scalar_one_or_none()
        if pkg and pkg.is_active and pkg.task_type == TaskType.captcha:
            investment = inv
            package = pkg
            break

    if not investment:
        raise HTTPException(400, detail="Your active package does not support captcha tasks.")

    today = date.today()
    _reset_daily_counter_if_needed(investment, today)

    if (investment.captchas_typed_today or 0) >= (investment.daily_captcha_limit or 0):
        raise HTTPException(400, detail="Daily captcha limit reached. Come back tomorrow.")

    captcha_text = _generate_captcha_text()
    salt = secrets.token_hex(8)
    # Hash the normalized form so mixed-case challenges verify exactly like
    # the case-insensitive submit path (which uppercases before comparing).
    text_hash = _hash_captcha(_normalize_captcha_input(captcha_text), salt)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CAPTCHA_EXPIRY_MINUTES)

    # Refresh behavior: once a new captcha is issued, any previously issued
    # (still unused) captcha for this user must no longer be accepted.
    await db.execute(
        update(CaptchaChallenge)
        .where(
            and_(
                CaptchaChallenge.user_id == user_id,
                CaptchaChallenge.is_used == False,
            )
        )
        .values(is_used=True)
    )

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
        timer_seconds=await _get_captcha_timer_seconds(db, package),
    )


@router.post("/submit", response_model=CaptchaSubmitResponse)
@limiter.limit("12/minute")
async def submit_captcha(
    request: Request,
    body: CaptchaSubmitRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await check_earning_access_by_id(user_id, db)
    task_access = await check_task_access(db, user_id)
    if not task_access["allowed"]:
        raise HTTPException(403, detail=task_access["reason"])

    # Row-lock the challenge so concurrent duplicate submits of the same
    # captcha serialize: exactly one of them can consume it.
    result = await db.execute(
        select(CaptchaChallenge).where(
            and_(
                CaptchaChallenge.id == body.captcha_id,
                CaptchaChallenge.user_id == user_id,
            )
        ).with_for_update()
    )
    challenge = result.scalars().first()
    if not challenge:
        raise HTTPException(404, detail="Captcha not found")
    if challenge.is_used:
        raise HTTPException(400, detail="Captcha already used")
    # Validate the answer before checking expiry so a successfully
    # completed task is recorded as completed even if late.
    expected_hash = _hash_captcha(_normalize_captcha_input(body.user_input), challenge.salt)
    is_correct = expected_hash == challenge.captcha_text_hash
    if not is_correct and datetime.now(timezone.utc) > challenge.expires_at:
        challenge.is_used = True
        # Expired submissions also consume one Task Progress unit.
        # Timeout error behavior below is unchanged (no earning granted).
        exp_investment = await _get_active_captcha_investment(db, user_id)
        if exp_investment is not None:
            _reset_daily_counter_if_needed(exp_investment, date.today())
            exp_investment.captchas_typed_today = (exp_investment.captchas_typed_today or 0) + 1
        attempt = await log_task_attempt(
            db, user_id, "captcha", status="expired",
            reference_id=challenge.id, reference_type="CaptchaChallenge",
            error_code=ERR_CAPTCHA_TIMEOUT,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", ""),
        )
        await log_task_error(db, user_id, "captcha", ERR_CAPTCHA_TIMEOUT,
            task_attempt_id=attempt.id, attempt_number=attempt.attempt_number)
        await db.commit()
        raise HTTPException(400, detail="Captcha expired")

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

    investment = None
    for inv in all_investments:
        pkg_result = await db.execute(select(Package).where(Package.name == inv.package_name))
        pkg = pkg_result.scalar_one_or_none()
        if pkg and pkg.is_active and pkg.task_type == TaskType.captcha:
            investment = inv
            break
    if not investment:
        raise HTTPException(400, detail="Your active package does not support captcha tasks.")

    today = date.today()
    _reset_daily_counter_if_needed(investment, today)

    # is_correct was computed up front so expiry never blocks a completion.
    challenge.is_used = True

    # Task Progress: every validated submission counts exactly once,
    # regardless of correctness. Reward/penalty branching below is unchanged.
    investment.captchas_typed_today = (investment.captchas_typed_today or 0) + 1

    attempt = await log_task_attempt(
        db, user_id, "captcha",
        status="completed" if is_correct else "failed",
        reference_id=challenge.id,
        reference_type="CaptchaChallenge",
        error_code=None if is_correct else ERR_CAPTCHA_INCORRECT,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", ""),
    )

    if not is_correct:
        await log_task_error(
            db, user_id, "captcha", ERR_CAPTCHA_INCORRECT,
            task_attempt_id=attempt.id,
            attempt_number=attempt.attempt_number,
        )

    earning = CaptchaEarning(
        user_id=user_id,
        captcha_text_original=challenge.captcha_text_hash,
        user_input=_normalize_captcha_input(body.user_input),
        is_correct=is_correct,
        amount_earned=Decimal("0"),
    )

    earned = Decimal("0")

    if is_correct:
        earned = (investment.earn_per_captcha or Decimal("0")).quantize(
            WALLET_PRECISION, rounding=ROUND_HALF_UP
        )
        user.captcha_wallet = (user.captcha_wallet + earned).quantize(
            WALLET_PRECISION, rounding=ROUND_HALF_UP
        )
        earning.amount_earned = earned

    remaining_today = (investment.daily_captcha_limit or 0) - (investment.captchas_typed_today or 0)

    db.add(earning)
    await db.commit()
    await db.refresh(user)

    return CaptchaSubmitResponse(
        success=is_correct,
        earned=earned,
        remaining_today=remaining_today,
        new_balance=user.captcha_wallet,
    )


@router.post("/expire")
@limiter.limit("30/minute")
async def expire_captcha(
    request: Request,
    body: dict | None = None,
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
        return {"success": False, "detail": "No active investment"}

    investment = None
    for inv in all_investments:
        pkg_result = await db.execute(select(Package).where(Package.name == inv.package_name))
        pkg = pkg_result.scalar_one_or_none()
        if pkg and pkg.is_active and pkg.task_type == TaskType.captcha:
            investment = inv
            break
    if not investment:
        return {"success": False, "detail": "No captcha package"}

    today = date.today()
    _reset_daily_counter_if_needed(investment, today)

    # An expired task left unsubmitted also reaches a terminal state and
    # counts exactly once. The conditional consume is atomic: only the
    # first ping for a given unused challenge increments (no earning,
    # no error is logged here — penalties apply to submitted answers).
    try:
        expired_cid = int((body or {}).get("captcha_id")) if (body or {}).get("captcha_id") is not None else None
    except (TypeError, ValueError):
        expired_cid = None
    if expired_cid is not None:
        consume_result = await db.execute(
            update(CaptchaChallenge)
            .where(
                and_(
                    CaptchaChallenge.id == expired_cid,
                    CaptchaChallenge.user_id == user_id,
                    CaptchaChallenge.is_used == False,
                )
            )
            .values(is_used=True)
        )
        if consume_result.rowcount:
            investment.captchas_typed_today = (investment.captchas_typed_today or 0) + 1

    await db.commit()

    daily_limit = investment.daily_captcha_limit or 0
    typed_today = investment.captchas_typed_today or 0
    remaining = max(0, daily_limit - typed_today)

    return {
        "success": True,
        "remaining_today": remaining,
        "typed_today": typed_today,
    }


@router.get("/stats", response_model=CaptchaStatsResponse)
@limiter.limit("30/minute")
async def get_captcha_stats(
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

    investment = None
    for inv in all_investments:
        pkg_result = await db.execute(select(Package).where(Package.name == inv.package_name))
        pkg = pkg_result.scalar_one_or_none()
        if pkg and pkg.is_active and pkg.task_type == TaskType.captcha:
            investment = inv
            break
    if not investment:
        return zero_stats

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


@router.get("/task-access")
@limiter.limit("30/minute")
async def get_task_access(
    request: Request,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    access = await check_task_access(db, user_id)
    return access


@router.get("/my-earnings")
@limiter.limit("30/minute")
async def get_my_captcha_earnings(
    request: Request,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(CaptchaEarning)
        .where(CaptchaEarning.user_id == user_id)
        .order_by(CaptchaEarning.created_at.desc())
        .limit(limit)
    )
    earnings = result.scalars().all()
    return {
        "data": [
            {
                "id": e.id,
                "amount_earned": float(e.amount_earned),
                "is_correct": e.is_correct,
                "created_at": e.created_at.isoformat(),
            }
            for e in earnings
        ]
    }
