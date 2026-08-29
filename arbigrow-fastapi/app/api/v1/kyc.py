from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal, ROUND_HALF_UP

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.kyc import KYC, DocumentType, KycPackage, PaymentStatus
from app.models.user import User
from app.models.system_config import SystemConfig
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, WalletTransactionStatus
from app.services.b2_service import upload_to_b2, generate_presigned_url
from app.utils.notifications import notify_admin


def _resolve_image_url(stored: str | None) -> str | None:
    if not stored:
        return None
    if stored.startswith("http"):
        return stored
    return generate_presigned_url(stored)

router = APIRouter(prefix="/kyc", tags=["KYC"])

WALLET_PRECISION = Decimal("0.00000000000001")


@router.get("/me")
async def get_my_kyc(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Read-only view of the authenticated user's own KYC submission (documents + metadata).
    Backend enforces owner check: only the current user can view their own record."""
    result = await db.execute(select(KYC).where(KYC.user_id == user_id))
    kyc = result.scalar_one_or_none()
    if not kyc:
        return {"has_kyc": False, "kyc": None}
    # Resolve presigned URLs for images/PDFs; front always exists, back may be None (passport)
    front_url = _resolve_image_url(kyc.front_image_key)
    back_url = _resolve_image_url(kyc.back_image_key) if kyc.back_image_key else None
    # If B2 not configured, fall back to raw key (admin can still see key existence)
    pkg_info = None
    if kyc.kyc_package_id:
        pkg_res = await db.execute(select(KycPackage).where(KycPackage.id == kyc.kyc_package_id))
        pkg = pkg_res.scalar_one_or_none()
        if pkg:
            pkg_info = {"id": pkg.id, "name": pkg.name, "price": str(pkg.price)}
    return {
        "has_kyc": True,
        "kyc": {
            "id": kyc.id,
            "user_id": kyc.user_id,
            "full_name": kyc.full_name,
            "country": kyc.country,
            "phone_number": kyc.phone_number,
            "document_type": kyc.document_type.value if kyc.document_type else None,
            "document_number": kyc.document_number,
            "front_image_key": kyc.front_image_key,
            "front_image_url": front_url,
            "back_image_key": kyc.back_image_key,
            "back_image_url": back_url,
            "status": kyc.status.value if kyc.status else None,
            "payment_status": kyc.payment_status.value if kyc.payment_status else None,
            "fee_paid": str(kyc.fee_paid) if kyc.fee_paid else "0",
            "kyc_package_id": kyc.kyc_package_id,
            "kyc_package": pkg_info,
            "transaction_id": kyc.transaction_id,
            "admin_note": kyc.admin_note,
            "created_at": kyc.created_at.isoformat() if kyc.created_at else None,
        },
    }


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

        # A new review cycle starts: reset the admin-controlled status so the
        # Admin Panel immediately shows the resubmission as pending instead of
        # keeping the previous rejected/issue state.
        if user:
            user.admin_kyc_status = "pending"
            if user.account_status == "on_hold":
                user.account_status = "inactive"
                user.account_issue = None

        # Re-deduct fee if previous was refunded
        fee_deducted = "0"
        if existing_kyc.payment_status == PaymentStatus.refunded and existing_kyc.fee_paid > 0:
            fee = existing_kyc.fee_paid
            dep_bal = user.deposit_wallet or Decimal("0")
            if dep_bal < fee:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient balance. KYC requires {fee} USDT. Your deposit wallet balance is {dep_bal} USDT.",
                )
            user.deposit_wallet = (dep_bal - fee).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
            user.kyc_hold = (user.kyc_hold or Decimal("0")) + fee
            existing_kyc.payment_status = PaymentStatus.paid
            fee_deducted = str(fee)

            wallet_txn = WalletTransaction(
                user_id=user_id,
                type=WalletTransactionType.kyc_fee_hold,
                wallet_type="deposit_wallet",
                amount=fee,
                balance_before=dep_bal,
                balance_after=user.deposit_wallet,
                reference_type="kyc",
                reference_id=existing_kyc.id,
                description="KYC Fee Placed on Hold",
                status=WalletTransactionStatus.held,
            )
            db.add(wallet_txn)

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
            "fee_deducted": fee_deducted,
            "deposit_wallet_balance": str(user.deposit_wallet) if user else "0",
            "front_image_url": _resolve_image_url(existing_kyc.front_image_key),
            "back_image_url": _resolve_image_url(existing_kyc.back_image_key) if existing_kyc.back_image_key else None,
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
        user.kyc_hold = (user.kyc_hold or Decimal("0")) + total_fee

        wallet_txn = WalletTransaction(
            user_id=user_id,
            type=WalletTransactionType.kyc_fee_hold,
            wallet_type="deposit_wallet",
            amount=total_fee,
            balance_before=deposit_balance,
            balance_after=user.deposit_wallet,
            reference_type="kyc",
            description="KYC Fee Placed on Hold",
            status=WalletTransactionStatus.held,
        )
        db.add(wallet_txn)

    # Validate NID requires back image
    if document_type == DocumentType.nid and not back_image:
        raise HTTPException(
            status_code=400, detail="Back image required for NID")

    if document_type == DocumentType.passport:
        back_image = None

    folder = f"kyc/{user_id}"

    front_key = None
    back_key = None
    front_key = await upload_to_b2(front_image, folder)
    if not front_key:
        raise HTTPException(status_code=500, detail="Failed to upload document image. Please try again.")
    if back_image:
        back_key = await upload_to_b2(back_image, folder)

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
        "front_image_url": _resolve_image_url(new_kyc.front_image_key),
        "back_image_url": _resolve_image_url(new_kyc.back_image_key) if new_kyc.back_image_key else None,
    }
