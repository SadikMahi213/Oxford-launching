from sqlalchemy import String, Integer, DateTime, Numeric
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal

from app.core.base import Base


class CompanyWallet(Base):
    __tablename__ = "company_wallet"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    total_kyc_collected: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), nullable=False, default=Decimal("0"), server_default="0"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
