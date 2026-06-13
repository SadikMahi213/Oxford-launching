from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal
from datetime import datetime, timedelta, timezone
import hashlib
import secrets


from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.kyc import KYC
from app.schemas.user import UserCreate, UserResponse, UserLogin, LoginResponse, ForgotPasswordRequest, ResetPasswordRequest, ResendVerificationRequest, VerifyEmailOTPRequest
from app.core.security import hash_password, verify_password, create_access_token, get_current_user_id
from app.core.rate_limiter import limiter
from app.utils.email import send_password_reset_email, send_email_verification
from app.utils.generate_username import generate_username
# from app.api.v1.deps import get_current_user


router = APIRouter(prefix="/auth", tags=["Auth"])


def _normalize_email(email: str) -> str:
    return str(email).strip().lower()


def _generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_otp_code(otp_code: str) -> str:
    return hashlib.sha256(otp_code.encode("utf-8")).hexdigest()


@router.post("/signup", response_model=UserResponse)
@limiter.limit("60/minute")
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
        email=normalized_email,
        hashed_password=hash_password(user_data.password),
        is_admin=False,
        email_verified=True,
        main_wallet=Decimal("0.00000000000000"),
        deposit_wallet=Decimal("0.00000000000000"),
        withdraw_wallet=Decimal("0.00000000000000"),
        referral_wallet=Decimal("0.00000000000000"),
        generation_wallet=Decimal("0.00000000000000"),
        arbx_wallet=Decimal("100.00000000000000"),
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

    # Generate username
    new_user.username = generate_username(
        new_user.full_name,
        new_user.id
    )

    #  Give 10 ARBX to referrer
    if ref_user:
        ref_user.arbx_wallet = (
            ref_user.arbx_wallet + Decimal("10.00000000000000")
        )

    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.post("/login", response_model=LoginResponse)
@limiter.limit("60/minute")
async def login(request: Request, user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    normalized_email = _normalize_email(user_data.email)

    result = await db.execute(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    user = result.scalar_one_or_none()

    # print(user.__dict__)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

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

    return {
        "access_token": access_token,
        "user": UserResponse(**user.__dict__,  phone_number=kyc.phone_number if kyc else None, country=kyc.country if kyc else None),
        "doc_submitted": doc_submitted,
        "kyc_status": kyc_status
    }


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

    # short-lived token (15 minutes)
    reset_token = create_access_token(
        data={
            "sub": str(user.id),
            "type": "password_reset"
        },
        expires_minutes=15
    )

    reset_link = f"{settings.FRONTEND_DOMAIN}/reset-password?token={reset_token}"

    # # TODO: Replace with real email sender
    # print("RESET LINK:", reset_link)

    await send_password_reset_email(user.email, reset_link)

    return {"message": "If this email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update password
    user.hashed_password = hash_password(data.new_password)

    await db.commit()

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
