from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey, Text
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class MatchingBonus(Base):
    __tablename__ = "matching_bonuses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    source_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )

    rank_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ranks.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    bonus_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )

    eligible_amount: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), nullable=False, default=Decimal("0")
    )

    bonus_percent: Mapped[Decimal] = mapped_column(
        Numeric(8, 4), nullable=False, default=Decimal("0")
    )

    bonus_amount: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), nullable=False, default=Decimal("0")
    )

    reference_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True, index=True
    )

    reference_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    user = relationship("User", foreign_keys=[user_id])
    source_user = relationship("User", foreign_keys=[source_user_id])
    rank = relationship("Rank", foreign_keys=[rank_id])

    @property
    def user_no(self) -> str | None:
        return self.user.user_no if self.user else None

    @property
    def source_user_no(self) -> str | None:
        return self.source_user.user_no if self.source_user else None
