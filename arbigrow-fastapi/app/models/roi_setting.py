from sqlalchemy import String, Integer, DateTime, func, Numeric, Boolean
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base


class ROISetting(Base):
    __tablename__ = "roi_settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    package_name: Mapped[str] = mapped_column(String(100), nullable=True)
    daily_percent: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
