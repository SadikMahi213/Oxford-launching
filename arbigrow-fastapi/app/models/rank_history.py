from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class RankHistory(Base):
    __tablename__ = "rank_histories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    rank_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ranks.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    previous_rank_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("ranks.id", ondelete="SET NULL"),
        nullable=True
    )

    team_volume: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), nullable=False, default=Decimal("0")
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="achieved"
    )

    achieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])
    rank = relationship("Rank", foreign_keys=[rank_id])
    previous_rank = relationship("Rank", foreign_keys=[previous_rank_id])

    @property
    def user_no(self) -> str | None:
        return self.user.user_no if self.user else None
