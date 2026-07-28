from sqlalchemy import BigInteger, String, Text, DateTime, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.core.base import Base


class VisitorLog(Base):
    __tablename__ = "visitor_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[str] = mapped_column(Text, default="")
    device_type: Mapped[str] = mapped_column(String(20), default="desktop")
    os: Mapped[str] = mapped_column(String(50), default="")
    browser: Mapped[str] = mapped_column(String(50), default="")
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country_code: Mapped[str | None] = mapped_column(String(5), nullable=True)
    traffic_source: Mapped[str] = mapped_column(String(50), default="direct")
    referrer_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_url: Mapped[str] = mapped_column(String(500), default="")
    visited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    __table_args__ = (
        Index("ix_visitor_logs_visited_at", "visited_at"),
        Index("ix_visitor_logs_ip_address", "ip_address"),
        Index("ix_visitor_logs_session_id", "session_id"),
        Index("ix_visitor_logs_traffic_source", "traffic_source"),
        Index("ix_visitor_logs_device_type", "device_type"),
    )
