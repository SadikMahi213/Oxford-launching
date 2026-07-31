from sqlalchemy import Integer, Numeric, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
from datetime import datetime

from app.core.base import Base


class PlatformStats(Base):
    __tablename__ = "platform_stats"

    id: Mapped[int] = mapped_column(primary_key=True)

    total_users: Mapped[int] = mapped_column(Integer, default=0)
    total_invested: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), default=Decimal("0")
    )
    total_withdrawn: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), default=Decimal("0")
    )
    total_profit_shared: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), default=Decimal("0")
    )

    active_investors: Mapped[int] = mapped_column(Integer, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
