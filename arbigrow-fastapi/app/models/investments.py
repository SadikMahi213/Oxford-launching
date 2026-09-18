from sqlalchemy import ForeignKey, DateTime, Date, Integer, String, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
from decimal import Decimal

from app.core.base import Base


class Investment(Base):
    __tablename__ = "investments"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False
    )

    # package snapshot
<<<<<<< HEAD
    package_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
=======
    package_name: Mapped[str] = mapped_column(String(100), nullable=False)
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0

    invested_amount: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=False
    )

    roi_percent: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False
    )

    expected_profit: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=False
    )

    daily_payment: Mapped[Decimal] = mapped_column(
        Numeric(16, 8),
        default=Decimal("0"),
        server_default="0"
    )

    captcha_required_per_day: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0"
    )

    earn_per_captcha: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    daily_captcha_limit: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0"
    )

    captchas_typed_today: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0"
    )

<<<<<<< HEAD
    captchas_expired_today: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0"
    )

=======
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    last_captcha_date: Mapped[date | None] = mapped_column(
        Date, nullable=True
    )

    profit_earned: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        default=Decimal("0"),
        server_default="0"
    )

    profit_percentage_paid: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        default=Decimal("0"),
        server_default="0"
    )

    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
<<<<<<< HEAD
        default="active",
        index=True,
=======
        default="active"
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
<<<<<<< HEAD
        default=datetime.utcnow,
        index=True,
=======
        default=datetime.utcnow
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    )

    user = relationship("User")
