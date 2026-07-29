from sqlalchemy import String, ForeignKey, Enum, DateTime, func, Text, Integer, Numeric, text
from datetime import datetime
from decimal import Decimal
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


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"


class KycPackage(Base):
    __tablename__ = "kyc_packages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price: Mapped[Decimal] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class KYC(Base):
    __tablename__ = "kyc_verifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
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

    kyc_package_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("kyc_packages.id", ondelete="SET NULL"),
        nullable=True
    )
    transaction_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        default=PaymentStatus.pending,
        nullable=False
    )
    fee_paid: Mapped[Decimal] = mapped_column(
        Numeric(20, 14),
        default=Decimal("0"),
        server_default=text("0"),
        nullable=False,
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    user = relationship("User", back_populates="kyc")
    package = relationship("KycPackage", foreign_keys=[kyc_package_id])
