from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class RankBonusConfig(Base):
    __tablename__ = "rank_bonus_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rank_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ranks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    bonus_type: Mapped[str] = mapped_column(String(50), nullable=False)
    bonus_percent: Mapped[Decimal] = mapped_column(
        Numeric(8, 4), nullable=False, default=Decimal("0")
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
