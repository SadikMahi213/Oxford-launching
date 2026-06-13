from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.kyc import KYC, DocumentType
from app.services.b2_service import upload_to_b2

router = APIRouter(prefix="/kyc", tags=["KYC"])


@router.post("/submit")
async def submit_kyc(
    country: str = Form(...),
    phone_number: str = Form(...),
    document_type: DocumentType = Form(...),
    document_number: str = Form(...),
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Check if KYC already exists
    result = await db.execute(
        select(KYC).where(KYC.user_id == user_id)
    )
    existing_kyc = result.scalar_one_or_none()

    if existing_kyc:
        raise HTTPException(status_code=400, detail="KYC already submitted")

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
    )

    db.add(new_kyc)
    await db.commit()
    await db.refresh(new_kyc)

    return {
        "message": "KYC submitted successfully",
        "status": new_kyc.status
    }
