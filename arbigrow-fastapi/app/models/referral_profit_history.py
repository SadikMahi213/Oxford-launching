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
<<<<<<< HEAD
        nullable=False,
        index=True
=======
        nullable=False
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    )

    receiver_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
<<<<<<< HEAD
        nullable=False,
        index=True
=======
        nullable=False
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    )

    investment_id: Mapped[int | None] = mapped_column(
        ForeignKey("investments.id"),
<<<<<<< HEAD
        nullable=True,
        index=True
=======
        nullable=True
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    )

    deposit_id: Mapped[int | None] = mapped_column(
        ForeignKey("deposits.id"),
        nullable=True
    )

<<<<<<< HEAD
    level: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
=======
    level: Mapped[int] = mapped_column(Integer, nullable=False)
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0

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
<<<<<<< HEAD
        default=datetime.utcnow,
        index=True
=======
        default=datetime.utcnow
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    )
