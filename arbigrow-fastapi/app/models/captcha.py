from sqlalchemy import ForeignKey, DateTime, Integer, String, Numeric, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal
from sqlalchemy.sql import func

from app.core.base import Base


class CaptchaChallenge(Base):
    __tablename__ = "captcha_challenges"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    captcha_text_hash: Mapped[str] = mapped_column(
        String(128), nullable=False
    )

    salt: Mapped[str] = mapped_column(String(32), nullable=False)

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    is_used: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class CaptchaEarning(Base):
    __tablename__ = "captcha_earnings"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    captcha_text_original: Mapped[str] = mapped_column(
        String(500), nullable=False
    )

    user_input: Mapped[str] = mapped_column(String(500), nullable=False)

    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    amount_earned: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), default=Decimal("0.00000000000000"), server_default="0"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", backref="captcha_earnings")
