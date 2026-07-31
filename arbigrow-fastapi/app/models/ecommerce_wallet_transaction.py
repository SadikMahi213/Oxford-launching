from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class EcommerceWalletTransaction(Base):
    __tablename__ = "ecommerce_wallet_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
