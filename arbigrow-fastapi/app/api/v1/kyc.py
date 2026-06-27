from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal, ROUND_HALF_UP

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.kyc import KYC, DocumentType, KycPackage
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

    # Check if KYC already exists
    result = await db.execute(
        select(KYC).where(KYC.user_id == user_id)
    )
    existing_kyc = result.scalar_one_or_none()

    if existing_kyc:
        raise HTTPException(status_code=400, detail="KYC already submitted")

    # Check if KYC package is enabled
    pkg_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "kyc_package_enabled")
    )
    pkg_enabled_config = pkg_result.scalar_one_or_none()
    pkg_enabled = (pkg_enabled_config.value if pkg_enabled_config else "true").lower() == "true"
    if not pkg_enabled:
        raise HTTPException(status_code=400, detail="KYC verification is currently disabled by the administrator")

    # Validate kyc_package_id if provided
    if kyc_package_id:
        pkg_result = await db.execute(
            select(KycPackage).where(KycPackage.id == kyc_package_id, KycPackage.is_active == True)
        )
        pkg = pkg_result.scalar_one_or_none()
        if not pkg:
            raise HTTPException(status_code=400, detail="Invalid or inactive KYC package selected")

    # Dynamic KYC fee check
    fee_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "kyc_fee")
    )
    kyc_fee_config = fee_result.scalar_one_or_none()
    kyc_fee = Decimal(kyc_fee_config.value) if kyc_fee_config else Decimal("0")

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if kyc_fee > 0:
        if user.deposit_wallet < kyc_fee:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. KYC verification requires {kyc_fee} USDT. Your deposit wallet balance is {user.deposit_wallet} USDT.",
            )
        user.deposit_wallet = (user.deposit_wallet - kyc_fee).quantize(
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
        country=country,
        phone_number=phone_number,
        document_type=document_type,
        document_number=document_number,
        front_image_key=front_key,
        back_image_key=back_key,
        kyc_package_id=kyc_package_id,
        transaction_id=transaction_id,
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
        "fee_deducted": str(kyc_fee) if kyc_fee > 0 else "0",
    }
