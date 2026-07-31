from sqlalchemy import String, Integer, DateTime, func, Text, Numeric
from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base


class WalletAuditLog(Base):
    __tablename__ = "wallet_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    admin_id: Mapped[int] = mapped_column(Integer, nullable=False)
    field_name: Mapped[str] = mapped_column(String(50), nullable=False)
    old_value: Mapped[Decimal | None] = mapped_column(Numeric(24, 14), nullable=True)
    new_value: Mapped[Decimal | None] = mapped_column(Numeric(24, 14), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
