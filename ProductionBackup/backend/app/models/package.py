from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from decimal import Decimal
import enum

from app.core.base import Base


class TaskType(str, enum.Enum):
    captcha = "captcha"
    ad_view = "ad_view"


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    investment_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    total_return: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    daily_payment: Mapped[Decimal] = mapped_column(
        Numeric(16, 8), nullable=False
    )

    duration_days: Mapped[int] = mapped_column(Integer, default=365)

    captcha_required_per_day: Mapped[int] = mapped_column(Integer, nullable=False)

    captcha_task_duration_seconds: Mapped[int] = mapped_column(Integer, default=30)

    earn_per_captcha: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=Decimal("0.0000"), server_default="0.0000")

    daily_captcha_limit: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    task_type: Mapped[TaskType] = mapped_column(
        SAEnum(TaskType, name="task_type_enum", create_constraint=True),
        default=TaskType.captcha,
        server_default="captcha",
    )

    ad_duration_seconds: Mapped[int] = mapped_column(Integer, default=30, server_default="30")

    signup_arbx_bonus: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), default=Decimal("0.00000000000000"), server_default="0.00000000000000"
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )
