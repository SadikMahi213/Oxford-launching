<<<<<<< HEAD
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
=======
from sqlalchemy import Integer, Numeric, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
from datetime import datetime

from app.core.base import Base


class PlatformStats(Base):
    __tablename__ = "platform_stats"

    id: Mapped[int] = mapped_column(primary_key=True)

<<<<<<< HEAD
    total_users: Mapped[str] = mapped_column(String(100), default="0")
    total_invested: Mapped[str] = mapped_column(String(100), default="0")
    total_withdrawn: Mapped[str] = mapped_column(String(100), default="0")
    total_profit_shared: Mapped[str] = mapped_column(String(100), default="0")
    active_investors: Mapped[str] = mapped_column(String(100), default="0")
=======
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
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
