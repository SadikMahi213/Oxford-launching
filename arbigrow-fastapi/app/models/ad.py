from sqlalchemy import ForeignKey, DateTime, Integer, String, Boolean, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal
from sqlalchemy.sql import func

from app.core.base import Base


class Ad(Base):
    __tablename__ = "ads"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    youtube_url: Mapped[str] = mapped_column(String(500), nullable=False)

    video_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    thumbnail: Mapped[str | None] = mapped_column(String(500), nullable=True)

    required_watch_seconds: Mapped[int] = mapped_column(Integer, default=30)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    creator = relationship("User", backref="created_ads")
