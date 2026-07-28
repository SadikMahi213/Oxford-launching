from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey, Boolean
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base


class Investment(Base):
    __tablename__ = "investments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    package_name: Mapped[str] = mapped_column(String(100), nullable=True)
    invested_amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    roi_percent: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=True, default=Decimal("0"))
    expected_profit: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    daily_payment: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    profit_earned: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    profit_percentage_paid: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=True, default=Decimal("0"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    captcha_required_per_day: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    earn_per_captcha: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    daily_captcha_limit: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    captchas_typed_today: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
