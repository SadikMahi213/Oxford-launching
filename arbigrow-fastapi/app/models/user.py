from sqlalchemy import String, Boolean, Integer, DateTime, Text, func
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from sqlalchemy import Numeric

from app.core.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=True
    )

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False)

    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    referral_code: Mapped[str] = mapped_column(
        String(8), unique=True, index=True, nullable=True)

    is_admin: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False)

    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false"
    )

    # Admin-controlled status used when KYC row does not exist yet.
    admin_kyc_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )

    # Account access control managed by admins.
    account_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
    )
    account_issue: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Email verification OTP (hashed + expiry)
    otp_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    otp_expiry: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Wallets (14 decimal precision)
    main_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    deposit_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    withdraw_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    referral_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    generation_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    arbx_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("100.00000000000000"),
        server_default="100"
    )

    arbx_mining_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    # ── Mining system (24h capped) ──────────────────────
    mining_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    mining_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    daily_mined: Mapped[Decimal] = mapped_column(
        Numeric(24, 14), nullable=True,
        default=Decimal("0.00000000000000"), server_default="0"
    )
    last_mine_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    ecommerce_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )



    # ancestry cache (up to 5 generations)
    parent_lvl_1_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_lvl_2_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_lvl_3_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_lvl_4_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_lvl_5_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    kyc = relationship("KYC", back_populates="user", uselist=False)
