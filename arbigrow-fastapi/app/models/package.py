from sqlalchemy import String, Integer, DateTime, func, Numeric, Boolean
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    investment_amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    daily_payment: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    signup_arbx_bonus: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    captcha_required_per_day: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    earn_per_captcha: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True, default=Decimal("0"))
    daily_captcha_limit: Mapped[int] = mapped_column(Integer, nullable=True, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
