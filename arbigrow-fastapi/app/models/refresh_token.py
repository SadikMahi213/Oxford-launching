from sqlalchemy import ForeignKey, DateTime, Integer, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from sqlalchemy.sql import func

from app.core.base import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    token_hash: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
