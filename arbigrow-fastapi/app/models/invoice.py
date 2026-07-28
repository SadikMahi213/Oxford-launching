from sqlalchemy import String, Integer, DateTime, func, Numeric, ForeignKey, Text
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    invoice_type: Mapped[str] = mapped_column(String(50), nullable=False)

    invoice_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    amount: Mapped[Decimal | None] = mapped_column(Numeric(24, 14), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USDT")
    status: Mapped[str] = mapped_column(String(20), default="generated")

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pdf_storage_key: Mapped[str | None] = mapped_column(String(255), nullable=True)

    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    emailed: Mapped[str] = mapped_column(String(20), default="no")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)

    user = relationship("User", lazy="selectin")
