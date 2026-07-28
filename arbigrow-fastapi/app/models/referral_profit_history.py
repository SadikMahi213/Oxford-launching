from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base


class ReferralProfitHistory(Base):
    __tablename__ = "referral_profit_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    source_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    investment_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("investments.id"), nullable=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
