from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from decimal import Decimal
from datetime import datetime, timedelta, timezone
import hashlib
import secrets


from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.kyc import KYC
from app.models.package import Package
from app.models.investments import Investment
from app.models.system_config import SystemConfig
from app.models.transfer_log import TransferLog
from app.schemas.user import UserCreate, UserResponse, UserLogin, LoginResponse, ForgotPasswordRequest, ResetPasswordRequest, ResendVerificationRequest, VerifyEmailOTPRequest
from app.core.security import hash_password, verify_password, create_access_token, get_current_user_id, verify_password_reset_token
from app.core.rate_limiter import limiter
from app.core.config import settings
from app.utils.email import send_password_reset_email, send_email_verification
from app.utils.generate_username import generate_username
from app.utils.notifications import notify_admin
from app.services.security_logger import SecurityLogger
# from app.api.v1.deps import get_current_user


router = APIRouter(prefix="/auth", tags=["Auth"])


def _normalize_email(email: str) -> str:
    return str(email).strip().lower()


def _generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_otp_code(otp_code: str) -> str:
    return hashlib.sha256(otp_code.encode("utf-8")).hexdigest()


def _generate_user_no() -> str:
    # 11-digit number: 10,000,000,000 to 99,999,999,999
    return str(secrets.randbelow(9 * 10**10) + 10**10)


@router.post("/signup", response_model=UserResponse)
@limiter.limit("5/minute")
async def signup(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    normalized_email = _normalize_email(user_data.email)

    ref_user = None

    if user_data.referral_code and user_data.referral_code.strip():
        result = await db.execute(
            select(User).where(User.username == user_data.referral_code.strip())
        )
        ref_user = result.scalar_one_or_none()

        if not ref_user:
            raise HTTPException(
                status_code=400,
                detail="Invalid referral code"
            )

    # Check email
    result = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    new_user = User(
        full_name=user_data.full_name,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        date_of_birth=user_data.date_of_birth,
        gender=user_data.gender,
        nationality=user_data.nationality,
        country_of_residence=user_data.country_of_residence,
        mobile_number=user_data.mobile_number,
        residential_address=user_data.residential_address,
        city=user_data.city,
        state_province=user_data.state_province,
        postal_code=user_data.postal_code,
        national_id_number=user_data.national_id_number,
        passport_number=user_data.passport_number,
        religion=user_data.religion,
        marital_status=user_data.marital_status,
        email=normalized_email,
        hashed_password=hash_password(user_data.password),
        is_admin=False,
        email_verified=False,
        main_wallet=Decimal("0.00000000000000"),
        deposit_wallet=Decimal("0.00000000000000"),
        withdraw_wallet=Decimal("0.00000000000000"),
        referral_wallet=Decimal("0.00000000000000"),
        generation_wallet=Decimal("0.00000000000000"),
        arbx_wallet=Decimal("0.00000000000000"),
        arbx_mining_wallet=Decimal("0.00000000000000"),
        username='temp'
    )

    # Build ancestry if referral code was provided and valid
    if ref_user:
        new_user.parent_lvl_1_id = ref_user.id
        new_user.parent_lvl_2_id = ref_user.parent_lvl_1_id
        new_user.parent_lvl_3_id = ref_user.parent_lvl_2_id
        new_user.parent_lvl_4_id = ref_user.parent_lvl_3_id
        new_user.parent_lvl_5_id = ref_user.parent_lvl_4_id

    db.add(new_user)
    await db.flush()  # getting ID before commit

    # Generate referral code from ID
    new_user.referral_code = str(new_user.id).zfill(8)

    # Generate user_no
    new_user.user_no = _generate_user_no()

    # Generate username
    new_user.username = generate_username(
        new_user.full_name,
        new_user.id
    )

    #  Give 10 ARBX to referrer (lock referrer row)
    if ref_user:
        await db.execute(
            select(User).where(User.id == ref_user.id).with_for_update()
        )
        ref_user.arbx_wallet = (
            ref_user.arbx_wallet + Decimal("10.00000000000000")
        )

    # Handle package selection
    if user_data.package_id:
        pkg_result = await db.execute(
            select(Package).where(Package.id == user_data.package_id, Package.is_active == True)
        )
        selected_pkg = pkg_result.scalar_one_or_none()

        if selected_pkg:
            if selected_pkg.investment_amount > 0:
                # Paid package — account is pending until payment verified
                new_user.account_status = "pending_payment"
                new_user.pending_package_id = selected_pkg.id
            else:
                # Free package — activate immediately, give signup bonus and create auto-investment
                new_user.account_status = "active"
                new_user.arbx_wallet = (new_user.arbx_wallet or 0) + (selected_pkg.signup_arbx_bonus or 0)
                now = datetime.now(timezone.utc)
                investment = Investment(
                    user_id=new_user.id,
                    package_name=selected_pkg.name,
                    invested_amount=Decimal("0"),
                    roi_percent=Decimal("0"),
                    expected_profit=Decimal("0"),
                    daily_payment=selected_pkg.daily_payment,
                    captcha_required_per_day=selected_pkg.captcha_required_per_day,
                    earn_per_captcha=selected_pkg.earn_per_captcha,
                    daily_captcha_limit=selected_pkg.daily_captcha_limit,
                    captchas_typed_today=0,
                    start_date=now,
                    end_date=now,
                    status="active",
                )
                db.add(investment)

    # ── OFA Signup Bonus ──────────────────────────────
    bonus_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "ofa_signup_bonus")
    )
    bonus_row = bonus_result.scalar_one_or_none()
    signup_bonus = Decimal(bonus_row.value) if bonus_row and bonus_row.value else Decimal("0")
    if signup_bonus > 0:
        new_user.arbx_wallet = (new_user.arbx_wallet or 0) + signup_bonus
        db.add(TransferLog(
            sender_id=1,
            receiver_id=new_user.id,
            amount=signup_bonus,
            fee=Decimal("0"),
            note="OFA welcome bonus",
            status="completed",
        ))

    await db.commit()
    await db.refresh(new_user)

    ref_msg = f" (Referred by: {ref_user.username})" if ref_user else ""
    await notify_admin(
        db=db, type="new_registration",
        message=f"User {new_user.full_name} ({new_user.email}) registered{ref_msg}",
        user_id=new_user.id, request=request,
    )

    return new_user


@router.post("/login", response_model=LoginResponse)
@limiter.limit("60/minute")
async def login(request: Request, response: Response, user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    normalized_email = _normalize_email(user_data.email)
    ip_address = request.client.host if request.client else None
    if request.headers.get("x-forwarded-for"):
        ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()
    device = (request.headers.get("user-agent", "") or "")[:255]

    result = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    user = result.scalar_one_or_none()

    if not user:
        await notify_admin(
            db=db, type="failed_login",
            message=f"Failed login attempt for {normalized_email} (user not found)",
            request=request,
        )
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # Check if account is blocked (with auto-unlock after 15 minutes)
    if user.blocked_at:
        if datetime.now(timezone.utc) - user.blocked_at < timedelta(minutes=15):
            reason = user.blocked_reason or "No reason provided"
            raise HTTPException(
                status_code=423,
                detail=f"Your account has been temporarily blocked by the administrator.\nReason: {reason}\nPlease contact support for further assistance.",
            )
        # Auto-unlock after 15 minutes
        user.failed_attempts = 0
        user.blocked_at = None
        user.blocked_reason = None
        await db.commit()

    # pending_payment users are allowed to login (they will see the payment page)
    is_pending_payment = (user.account_status or "").lower() == "pending_payment"

    if not verify_password(user_data.password, user.hashed_password):
        user.failed_attempts = (user.failed_attempts or 0) + 1

        if user.failed_attempts >= settings.MAX_FAILED_ATTEMPTS:
            user.blocked_at = datetime.now(timezone.utc)
            user.blocked_reason = f"Auto-blocked after {user.failed_attempts} consecutive failed login attempts"
            await db.commit()

            sec_logger = SecurityLogger(db)
            await sec_logger.log(
                event_type="account_blocked",
                user_id=user.id,
                email=user.email,
                ip_address=ip_address,
                device=device,
                details=f"Blocked after {user.failed_attempts} failed attempts",
            )

            await notify_admin(
                db=db, type="account_blocked",
                message=f"Account blocked for {user.full_name} ({user.email}) after {user.failed_attempts} failed login attempts",
                user_id=user.id, request=request,
            )
        else:
            await db.commit()

        await notify_admin(
            db=db, type="failed_login",
            message=f"Failed login attempt ({user.failed_attempts}/{settings.MAX_FAILED_ATTEMPTS}) for {user.full_name} ({user.email})",
            user_id=user.id, request=request,
        )
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # Successful login — reset failed attempts
    was_blocked = bool(user.blocked_at)
    user.failed_attempts = 0
    user.blocked_at = None
    user.blocked_reason = None
    user.last_login_ip = ip_address
    user.last_login_device = device
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    # Get KYC
    kyc_result = await db.execute(
        select(KYC).where(KYC.user_id == user.id)
    )
    kyc = kyc_result.scalar_one_or_none()

    doc_submitted = False
    kyc_status = None

    if kyc and kyc.document_number:
        doc_submitted = True

    if kyc:
        kyc_status = kyc.status.value

    access_token = create_access_token(
        data={"sub": str(user.id)}
    )

    # Session cookie (no max_age — deleted on browser close)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
    )

    await notify_admin(
        db=db, type="login",
        message=f"User {user.full_name} ({user.email}) logged in",
        user_id=user.id, request=request,
    )

    sec_logger = SecurityLogger(db)
    await sec_logger.log(
        event_type="login",
        user_id=user.id,
        email=user.email,
        ip_address=ip_address,
        device=device,
    )

    return {
        "access_token": access_token,
        "user": UserResponse(**user.__dict__,  phone_number=kyc.phone_number if kyc else None, country=kyc.country if kyc else None),
        "doc_submitted": doc_submitted,
        "kyc_status": kyc_status,
        "payment_required": is_pending_payment,
        "pending_package_id": user.pending_package_id,
    }


@router.post("/logout")
async def logout(
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        await notify_admin(
            db=db, type="logout",
            message=f"User {user.full_name} ({user.email}) logged out",
            user_id=user.id, request=request,
        )
        sec_logger = SecurityLogger(db)
        ip_address = request.client.host if request.client else None
        if request.headers.get("x-forwarded-for"):
            ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()
        await sec_logger.log(
            event_type="logout",
            user_id=user.id,
            email=user.email,
            ip_address=ip_address,
            device=(request.headers.get("user-agent", "") or "")[:255],
        )

    return {"message": "Logged out"}


@router.post("/forgot-password")
@limiter.limit("10/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    normalized_email = _normalize_email(data.email)
    result = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    user = result.scalar_one_or_none()

    # returning success message (to prevent email enumeration)
    if not user:
        return {"message": "If this email exists, a reset link has been sent."}

    # short-lived token (15 minutes) — one-time use enforced by reset_token_hash
    reset_token = create_access_token(
        data={
            "sub": str(user.id),
            "type": "password_reset"
        },
        expires_minutes=15
    )

    user.reset_token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
    await db.commit()

    reset_link = f"{settings.FRONTEND_DOMAIN}/reset-password"

    # NOTE: Token is sent in email body, NOT in URL query string.
    # This prevents exposure in browser history, server logs, and Referer headers.

    await send_password_reset_email(user.email, f"Your reset link: {reset_link}\n\nYour reset token: {reset_token}")

    return {"message": "If this email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    user_id = verify_password_reset_token(data.token)

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # One-time token enforcement
    token_hash = hashlib.sha256(data.token.encode("utf-8")).hexdigest()
    if not user.reset_token_hash:
        raise HTTPException(status_code=400, detail="Token already used")
    if user.reset_token_hash != token_hash:
        raise HTTPException(status_code=400, detail="Token already used or invalid")

    user.hashed_password = hash_password(data.new_password)
    # Reset security fields on password change
    user.failed_attempts = 0
    user.blocked_at = None
    user.blocked_reason = None
    user.reset_token_hash = None  # Invalidate token (one-time use)

    await db.commit()

    await notify_admin(
        db=db, type="password_change",
        message=f"User {user.full_name} ({user.email}) changed their password",
        user_id=user.id, request=request,
    )

    sec_logger = SecurityLogger(db)
    ip_address = request.client.host if request.client else None
    if request.headers.get("x-forwarded-for"):
        ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()
    await sec_logger.log(
        event_type="password_change",
        user_id=user.id,
        email=user.email,
        ip_address=ip_address,
        device=(request.headers.get("user-agent", "") or "")[:255],
    )

    return {"message": "Password reset successful"}


@router.post("/verify-email")
@limiter.limit("10/minute")
async def verify_email(
    request: Request,
    data: VerifyEmailOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    normalized_email = _normalize_email(data.email)
    result = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or OTP")

    if user.email_verified:
        return {"message": "Email already verified"}

    if not user.otp_code or not user.otp_expiry:
        raise HTTPException(
            status_code=400,
            detail="Verification OTP not found. Please request a new OTP."
        )

    if user.otp_expiry < datetime.now(timezone.utc):
        user.otp_code = None
        user.otp_expiry = None
        await db.commit()
        raise HTTPException(
            status_code=410,
            detail="Verification OTP expired. Please request a new OTP."
        )

    if user.otp_code != _hash_otp_code(data.otp):
        raise HTTPException(status_code=400, detail="Invalid email or OTP")

    user.email_verified = True
    user.otp_code = None
    user.otp_expiry = None
    await db.commit()

    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
@limiter.limit("15/minute")
async def resend_verification(
    request: Request,
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db)
):
    normalized_email = _normalize_email(data.email)
    result = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    user = result.scalar_one_or_none()

    # Always return same response to prevent email enumeration
    if not user:
        return {"message": "If this email exists, a verification OTP has been sent."}

    if user.email_verified:
        return {"message": "Email already verified."}

    otp_code = _generate_otp_code()
    user.otp_code = _hash_otp_code(otp_code)
    user.otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.commit()

    await send_email_verification(user.email, otp_code, user.full_name)

    return {"message": "If this email exists, a verification OTP has been sent."}
