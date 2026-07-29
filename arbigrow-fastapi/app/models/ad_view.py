from sqlalchemy import ForeignKey, DateTime, Integer, Numeric, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal
from sqlalchemy.sql import func

from app.core.base import Base


class AdView(Base):
    __tablename__ = "ad_views"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    ad_id: Mapped[int | None] = mapped_column(
        ForeignKey("ads.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    amount_earned: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), default=Decimal("0.00000000000000"), server_default="0"
    )

    user = relationship("User", backref="ad_views")
