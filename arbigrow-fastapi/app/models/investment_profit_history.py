from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base


class InvestmentProfitHistory(Base):
    __tablename__ = "investment_profit_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    investment_id: Mapped[int] = mapped_column(Integer, ForeignKey("investments.id"), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    percentage: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
