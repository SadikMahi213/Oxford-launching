from sqlalchemy import String, Integer, DateTime, Text, func, Index
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class SecurityLog(Base):
    __tablename__ = "security_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True, index=True
    )

    event_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )

    email: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True
    )

    device: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    details: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    __table_args__ = (
        Index("ix_security_logs_event_created", "event_type", "created_at"),
    )
