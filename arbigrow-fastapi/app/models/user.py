from sqlalchemy import String, Boolean, Integer, DateTime, Text, Date, func, ForeignKey
from datetime import datetime, date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from sqlalchemy import Numeric

from app.core.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_no: Mapped[str | None] = mapped_column(
        String(20), unique=True, nullable=True, index=True
    )

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )

    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country_of_residence: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    residential_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state_province: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    national_id_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    passport_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    religion: Mapped[str | None] = mapped_column(String(50), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

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

    kyc_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Account access control: inactive until KYC is approved.
    account_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="inactive",
        server_default="inactive",
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

    captcha_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    ad_view_wallet: Mapped[Decimal] = mapped_column(
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

    matching_bonus_wallet: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    # Security fields
    failed_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    blocked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    blocked_reason: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    blocked_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    last_login_ip: Mapped[str | None] = mapped_column(
        String(45), nullable=True
    )
    last_login_device: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Activity heartbeat: updated on each authenticated request (throttled) so
    # the admin dashboard can count real members currently online (not just
    # anonymous visitor sessions).
    last_active_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    profile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Pending package for registration (paid packages require payment before activation)
    pending_package_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Rank system
    current_rank_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("ranks.id", ondelete="SET NULL"),
        nullable=True, index=True
    )

    team_volume: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    kyc_approved_team_volume: Mapped[Decimal | None] = mapped_column(
        Numeric(24, 14), nullable=True, default=None
    )

    # Exact lifetime Team Volume that matching bonus has already been paid up
    # to. Combined with the permanent KYC snapshot, this prevents a partial
    # band or a duplicate deposit event from paying the same volume twice.
    bonused_up_to: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=False,
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
        nullable=False
    )

    kyc_hold: Mapped[Decimal] = mapped_column(
        Numeric(24, 14),
        nullable=True,
        default=Decimal("0.00000000000000"),
        server_default="0"
    )

    kyc = relationship("KYC", back_populates="user", uselist=False)
