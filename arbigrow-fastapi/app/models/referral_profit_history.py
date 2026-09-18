from sqlalchemy import ForeignKey, DateTime, Numeric, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from decimal import Decimal

from app.core.base import Base


class ReferralProfitHistory(Base):
    __tablename__ = "referral_profit_history"

    id: Mapped[int] = mapped_column(primary_key=True)

    source_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    receiver_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    investment_id: Mapped[int | None] = mapped_column(
        ForeignKey("investments.id"),
        nullable=True,
        index=True
    )

    deposit_id: Mapped[int | None] = mapped_column(
        ForeignKey("deposits.id"),
        nullable=True
    )

    level: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    percentage: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=False
    )

    type: Mapped[str] = mapped_column(
        String(30),
        default="daily_roi"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        index=True
    )
