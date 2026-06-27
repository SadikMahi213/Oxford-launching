from sqlalchemy import String, Boolean, Integer, DateTime, func, Numeric, Text
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class Rank(Base):
    __tablename__ = "ranks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True
    )

    slug: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )

    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, unique=True, index=True
    )

    target_volume: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), nullable=False, default=Decimal("0")
    )

    max_matching_percent: Mapped[Decimal] = mapped_column(
        Numeric(8, 4), nullable=False, default=Decimal("100")
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    bonus_configs = relationship(
        "RankBonusConfig",
        backref="rank",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="RankBonusConfig.sort_order",
    )
