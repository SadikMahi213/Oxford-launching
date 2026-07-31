from datetime import datetime
from decimal import Decimal
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.base import Base
import enum


class OFATransactionType(str, enum.Enum):
    signup_bonus = "signup_bonus"
    mining_reward = "mining_reward"
    package_signup_bonus = "package_signup_bonus"
    referral_bonus = "referral_bonus"
    ofa_to_usdt = "ofa_to_usdt"
    ecommerce_seller_bonus = "ecommerce_seller_bonus"
    adjustment = "adjustment"


class OFACoinTransaction(Base):
    __tablename__ = "ofa_coin_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    tx_type: Mapped[OFATransactionType] = mapped_column(SAEnum(OFATransactionType, native_enum=False, create_constraint=False), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    wallet_balance_before: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    wallet_balance_after: Mapped[Decimal] = mapped_column(Numeric(24, 14), nullable=False)
    target_wallet: Mapped[str] = mapped_column(String(50), nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
