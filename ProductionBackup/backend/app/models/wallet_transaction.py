from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Numeric, Enum as SAEnum
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
import enum

from app.core.base import Base


class WalletTransactionType(str, enum.Enum):
    kyc_fee_hold = "kyc_fee_hold"
    kyc_fee_release = "kyc_fee_release"
    kyc_fee_refund = "kyc_fee_refund"
    kyc_fee_reset_refund = "kyc_fee_reset_refund"


class WalletTransactionStatus(str, enum.Enum):
    held = "held"
    completed = "completed"
    refunded = "refunded"


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    type: Mapped[WalletTransactionType] = mapped_column(
        SAEnum(WalletTransactionType, native_enum=False, create_constraint=False, length=30),
        nullable=False,
        index=True,
    )
    wallet_type: Mapped[str] = mapped_column(String(30), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    balance_before: Mapped[Decimal | None] = mapped_column(
        Numeric(24, 14), nullable=True
    )
    balance_after: Mapped[Decimal | None] = mapped_column(
        Numeric(24, 14), nullable=True
    )
    reference_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[WalletTransactionStatus] = mapped_column(
        SAEnum(WalletTransactionStatus, native_enum=False, create_constraint=False, length=20),
        nullable=False,
        default=WalletTransactionStatus.held,
        server_default="held",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
