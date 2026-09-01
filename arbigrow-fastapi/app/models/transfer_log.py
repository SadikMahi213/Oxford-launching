from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class TransferLog(Base):
    __tablename__ = "transfer_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    receiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), nullable=False
    )
    fee: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), nullable=True, default=Decimal("0.00000000000000")
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="completed"
    )
    source_wallet: Mapped[str | None] = mapped_column(String(50), nullable=True)
    destination_wallet: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sender_full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sender_user_no: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sender_username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sender_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sender_mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    receiver_full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    receiver_user_no: Mapped[str | None] = mapped_column(String(20), nullable=True)
    receiver_username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    receiver_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    receiver_mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
