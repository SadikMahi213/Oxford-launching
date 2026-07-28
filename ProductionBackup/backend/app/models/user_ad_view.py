from sqlalchemy import ForeignKey, DateTime, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal
from sqlalchemy.sql import func

from app.core.base import Base


class UserAdView(Base):
    __tablename__ = "user_ad_views"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    ad_id: Mapped[int] = mapped_column(
        ForeignKey("ads.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    view_count: Mapped[int] = mapped_column(Integer, default=0)

    total_rewarded: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), default=Decimal("0.00000000000000"), server_default="0"
    )

    last_viewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", backref="user_ad_views")
    ad = relationship("Ad", backref="user_ad_views")

    __table_args__ = (
        UniqueConstraint("user_id", "ad_id", name="uq_user_ad"),
    )
