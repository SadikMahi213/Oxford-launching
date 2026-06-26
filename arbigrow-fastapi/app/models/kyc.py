from sqlalchemy import String, ForeignKey, Enum, DateTime, func
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.base import Base
import enum


class DocumentType(str, enum.Enum):
    nid = "nid"
    passport = "passport"
    driving_license = "driving_license"


class KYCStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class KYC(Base):
    __tablename__ = "kyc_verifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    country: Mapped[str] = mapped_column(String(100), nullable=False)

    phone_number: Mapped[str] = mapped_column(
        String(20),
        nullable=True,
    )

    document_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType),
        nullable=False
    )

    document_number: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    front_image_key: Mapped[str] = mapped_column(String(255), nullable=False)
    back_image_key: Mapped[str | None] = mapped_column(
        String(255), nullable=True)

    status: Mapped[KYCStatus] = mapped_column(
        Enum(KYCStatus),
        default=KYCStatus.pending,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    user = relationship("User", back_populates="kyc")
