from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=60)
    referral_code: str | None = None
    package_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    nationality: str | None = None
    country_of_residence: str | None = None
    mobile_number: str | None = None
    residential_address: str | None = None
    city: str | None = None
    state_province: str | None = None
    postal_code: str | None = None
    national_id_number: str | None = None
    passport_number: str | None = None
    religion: str | None = None
    marital_status: str | None = None


class UserResponse(BaseModel):
    id: int
    user_no: Optional[str] = None
    full_name: str

    email: EmailStr
    referral_code: str
    is_admin: bool
    username: str
    member_id: str = ""

    @model_validator(mode="after")
    def set_member_id(self):
        if self.username:
            self.member_id = self.username
        return self

    main_wallet: Decimal
    deposit_wallet: Decimal
    withdraw_wallet: Decimal
    referral_wallet: Decimal
    generation_wallet: Decimal
    arbx_wallet: Decimal
    arbx_mining_wallet: Decimal
    captcha_wallet: Decimal
    ad_view_wallet: Decimal
    ecommerce_wallet: Decimal
    matching_bonus_wallet: Decimal = Decimal("0")
    team_volume: Decimal = Decimal("0")
    email_verified: bool
    profile_image_url: Optional[str] = None
    kyc_hold: Decimal = Decimal("0")

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    country_of_residence: Optional[str] = None
    mobile_number: Optional[str] = None
    residential_address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    national_id_number: Optional[str] = None
    passport_number: Optional[str] = None
    religion: Optional[str] = None
    marital_status: Optional[str] = None

    phone_number: Optional[str] = None
    country: Optional[str] = None
    is_mining: Optional[bool] = False
    mining_started_at: Optional[datetime] = None
    account_status: str = "active"
    account_issue: Optional[str] = None
    pending_package_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def map_mining_active(cls, data):
        if isinstance(data, dict) and "mining_active" in data and "is_mining" not in data:
            data["is_mining"] = data.pop("mining_active")
        return data

    class Config:
        from_attributes = True
        json_encoders = {Decimal: lambda v: format(v, ".14f")}


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False


class LoginResponse(BaseModel):
    access_token: str
    user: UserResponse
    doc_submitted: bool
    kyc_status: Optional[str] = None
    kyc_note: Optional[str] = None
    payment_required: bool = False
    pending_package_id: Optional[int] = None

    class Config:
        from_attributes = True


class UserRefreshResponse(BaseModel):
    user: UserResponse
    doc_submitted: bool
    kyc_status: Optional[str] = None
    kyc_note: Optional[str] = None
    kyc_fee_refunded: bool = False
    personal_volume: str = "0"
    total_matching_bonus_earned: str = "0"
    network_volume: str = "0"


class IdentityVerificationRequest(BaseModel):
    nid_passport: str = Field(..., min_length=5, max_length=30)


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=255)
    verification: str = Field(..., min_length=1, max_length=255)


class ResetPasswordRequest(BaseModel):
    new_password: str
    token: str

    @model_validator(mode="after")
    def validate_password_strength(self):
        password = self.new_password
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in password):
            raise ValueError("Password must contain an uppercase letter")
        if not any(c.islower() for c in password):
            raise ValueError("Password must contain a lowercase letter")
        if not any(c.isdigit() for c in password):
            raise ValueError("Password must contain a number")
        if not any(c in "!@#$%^&*(),.?\":{}|<>" for c in password):
            raise ValueError("Password must contain a special character")
        return self


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class VerifyEmailOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ReferralMemberResponse(BaseModel):
    id: int
    name: str
    username: str
    level: int
    join_date: str
    total_earnings: Decimal
    referred_by: Optional[str] = None
    direct_referrals: int = 0
    status: str

    class Config:
        from_attributes = True
        json_encoders = {Decimal: lambda v: format(v, ".14f")}


class ReferralLevelResponse(BaseModel):
    level: int
    commission_rate: str
    total_earnings: Decimal
    users: List[ReferralMemberResponse]

    class Config:
        from_attributes = True
        json_encoders = {Decimal: lambda v: format(v, ".14f")}


class ReferralNetworkResponse(BaseModel):
    total_team_members: int
    total_referrals: int
    total_active_referrals: int
    bonus_eligible_members: int
    non_bonus_members: int
    levels: List[ReferralLevelResponse]

    class Config:
        from_attributes = True
        json_encoders = {Decimal: lambda v: format(v, ".14f")}


TRANSFER_FROM_WALLETS = [
    "main_wallet",
    "referral_wallet", "generation_wallet", "ecommerce_wallet",
    "captcha_wallet", "ad_view_wallet", "matching_bonus_wallet",
]

TRANSFER_TO_WALLETS = [
    "main_wallet", "deposit_wallet",
]


class WalletTransferRequest(BaseModel):
    from_wallet: str = Field(..., pattern=f"^({'|'.join(TRANSFER_FROM_WALLETS)})$")
    to_wallet: str = Field(..., pattern=f"^({'|'.join(TRANSFER_TO_WALLETS)})$")
    amount: Decimal = Field(gt=0)


class WalletTransferResponse(BaseModel):
    message: str
    from_wallet: str
    to_wallet: str
    amount: float
    from_balance: float
    to_balance: float


class ConvertOFARequest(BaseModel):
    ofa_amount: Decimal = Field(gt=0)


class ConvertOFAResponse(BaseModel):
    message: str
    ofa_amount: float
    usdt_amount: float
    arbx_wallet_balance: float
    main_wallet_balance: float
    rate: str


class ProfileImageUpdateRequest(BaseModel):
    profile_image_url: str


class SendFundsRequest(BaseModel):
    recipient: str = Field(..., min_length=1, description="Email, username, or user ID of the recipient")
    amount: Decimal = Field(gt=0)
    note: str | None = None


class TransferMatchingBonusRequest(BaseModel):
    recipient: str = Field(..., min_length=1, description="Email, username, or user ID of the recipient")
    amount: Decimal = Field(gt=0)
    note: str | None = None


class TransferLogSchema(BaseModel):
    id: int
    sender_id: int
    sender_name: str = ""
    receiver_id: int
    receiver_name: str = ""
    amount: float
    note: str | None = None
    status: str
    created_at: str
    source_wallet: str | None = None
    destination_wallet: str | None = None
    sender_full_name: str | None = None
    sender_user_no: str | None = None
    sender_username: str | None = None
    sender_email: str | None = None
    sender_mobile: str | None = None
    receiver_full_name: str | None = None
    receiver_user_no: str | None = None
    receiver_username: str | None = None
    receiver_email: str | None = None
    receiver_mobile: str | None = None


class TransferHistoryResponse(BaseModel):
    sent: list[TransferLogSchema]
    received: list[TransferLogSchema]
