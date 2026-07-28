from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base


class TransferLog(Base):
    __tablename__ = "transfer_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    fee: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
