from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.core.base import Base


class PlatformStats(Base):
    __tablename__ = "platform_stats"

    id: Mapped[int] = mapped_column(primary_key=True)

    total_users: Mapped[str] = mapped_column(String(100), default="0")
    total_invested: Mapped[str] = mapped_column(String(100), default="0")
    total_withdrawn: Mapped[str] = mapped_column(String(100), default="0")
    total_profit_shared: Mapped[str] = mapped_column(String(100), default="0")
    active_investors: Mapped[str] = mapped_column(String(100), default="0")

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
