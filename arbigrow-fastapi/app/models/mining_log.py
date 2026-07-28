from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base


class MiningLog(Base):
    __tablename__ = "mining_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    mined_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mined_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    daily_mined_after: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
