from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal, ROUND_HALF_UP

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.kyc import KYC, DocumentType, KycPackage, PaymentStatus
from app.models.user import User
from app.models.system_config import SystemConfig
from app.services.b2_service import upload_to_b2
from app.utils.notifications import notify_admin

router = APIRouter(prefix="/kyc", tags=["KYC"])

WALLET_PRECISION = Decimal("0.00000000000001")


@router.get("/active-package")
async def get_active_kyc_package(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KycPackage).where(KycPackage.is_active == True).order_by(KycPackage.id.desc()).limit(1)
    )
    pkg = result.scalar_one_or_none()
    if not pkg:
        return {"active": False, "package": None}
    return {
        "active": True,
        "package": {
            "id": pkg.id,
            "name": pkg.name,
            "price": str(pkg.price),
            "description": pkg.description,
        }
    }


@router.post("/submit")
async def submit_kyc(
    request: Request,
    full_name: str = Form(...),
    country: str = Form(...),
    phone_number: str = Form(...),
    document_type: DocumentType = Form(...),
    document_number: str = Form(...),
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(None),
    kyc_package_id: int = Form(None),
    transaction_id: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    ALLOWED_KYC_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if front_image.content_type not in ALLOWED_KYC_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, WebP images and PDF files are allowed for KYC documents")
    if back_image and back_image.content_type not in ALLOWED_KYC_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, WebP images and PDF files are allowed for KYC documents")

    # Validate full_name
    if not full_name or not full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")

    # Check if KYC already exists
    result = await db.execute(
        select(KYC).where(KYC.user_id == user_id)
    )
    existing_kyc = result.scalar_one_or_none()

    if existing_kyc:
        if existing_kyc.status.value == "approved":
            raise HTTPException(status_code=400, detail="KYC already approved")

        # Resubmission for rejected/pending: update existing record
        if document_type == DocumentType.nid and not back_image:
            raise HTTPException(status_code=400, detail="Back image required for NID")
        if document_type == DocumentType.passport:
            back_image = None

        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()

        existing_kyc.full_name = full_name.strip()
        existing_kyc.country = country
        existing_kyc.phone_number = phone_number
        existing_kyc.document_type = document_type
        existing_kyc.document_number = document_number
        existing_kyc.admin_note = None
        existing_kyc.status = "pending"
        existing_kyc.transaction_id = transaction_id

        folder = f"kyc/{user_id}"
        try:
            front_key = await upload_to_b2(front_image, folder)
            if front_key:
                existing_kyc.front_image_key = front_key
            if back_image:
                back_key = await upload_to_b2(back_image, folder)
                if back_key:
                    existing_kyc.back_image_key = back_key
        except RuntimeError:
            pass

        await db.commit()
        await db.refresh(existing_kyc)

        await notify_admin(
            db=db, type="kyc_resubmitted",
            message=f"User #{user_id} resubmitted KYC ({document_type.value}) from {country}",
            user_id=user_id, request=request,
        )

        return {
            "message": "KYC resubmitted successfully",
            "status": existing_kyc.status,
            "fee_deducted": "0",
            "deposit_wallet_balance": str(user.deposit_wallet) if user else "0",
        }

    # Check if KYC package is enabled
    pkg_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "kyc_package_enabled")
    )
    pkg_enabled_config = pkg_result.scalar_one_or_none()
    pkg_enabled = (pkg_enabled_config.value if pkg_enabled_config else "true").lower() == "true"
    if not pkg_enabled:
        raise HTTPException(status_code=400, detail="KYC verification is currently disabled by the administrator")

    # Validate kyc_package_id if provided
    pkg = None
    if kyc_package_id:
        pkg_result = await db.execute(
            select(KycPackage).where(KycPackage.id == kyc_package_id, KycPackage.is_active == True)
        )
        pkg = pkg_result.scalar_one_or_none()
        if not pkg:
            raise HTTPException(status_code=400, detail="Invalid or inactive KYC package selected")

    # Calculate total fee: kyc_fee (base) + package price (if any)
    fee_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "kyc_fee")
    )
    kyc_fee_config = fee_result.scalar_one_or_none()
    kyc_fee = Decimal(kyc_fee_config.value) if kyc_fee_config else Decimal("0")

    total_fee = kyc_fee
    if pkg:
        total_fee += pkg.price

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    deposit_balance = user.deposit_wallet or Decimal("0")
    if total_fee > 0:
        if deposit_balance < total_fee:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. KYC verification requires {total_fee} USDT. Your deposit wallet balance is {deposit_balance} USDT.",
            )
        user.deposit_wallet = (deposit_balance - total_fee).quantize(
            WALLET_PRECISION, rounding=ROUND_HALF_UP
        )

    # Validate NID requires back image
    if document_type == DocumentType.nid and not back_image:
        raise HTTPException(
            status_code=400, detail="Back image required for NID")

    if document_type == DocumentType.passport:
        back_image = None

    folder = f"kyc/{user_id}"

    front_key = None
    back_key = None
    try:
        front_key = await upload_to_b2(front_image, folder)
        if back_image:
            back_key = await upload_to_b2(back_image, folder)
    except RuntimeError:
        front_key = None
        back_key = None

    new_kyc = KYC(
        user_id=user_id,
        fee_paid=total_fee,
        full_name=full_name.strip(),
        country=country,
        phone_number=phone_number,
        document_type=document_type,
        document_number=document_number,
        front_image_key=front_key,
        back_image_key=back_key,
        kyc_package_id=kyc_package_id,
        transaction_id=transaction_id,
        payment_status=PaymentStatus.paid,
    )

    db.add(new_kyc)
    await db.commit()
    await db.refresh(new_kyc)

    await notify_admin(
        db=db, type="kyc_submitted",
        message=f"User #{user_id} submitted KYC ({document_type.value}) from {country}",
        user_id=user_id, request=request,
    )

    return {
        "message": "KYC submitted successfully",
        "status": new_kyc.status,
        "fee_deducted": str(total_fee) if total_fee > 0 else "0",
        "deposit_wallet_balance": str(user.deposit_wallet or Decimal("0")),
    }
