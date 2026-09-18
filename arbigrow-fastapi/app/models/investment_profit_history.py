from sqlalchemy import ForeignKey, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal

from app.core.base import Base


class InvestmentProfitHistory(Base):
    __tablename__ = "investment_profit_history"

    id: Mapped[int] = mapped_column(primary_key=True)

    investment_id: Mapped[int] = mapped_column(
        ForeignKey("investments.id"),
        index=True,
        nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=False
    )

    percentage: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    investment = relationship("Investment")
