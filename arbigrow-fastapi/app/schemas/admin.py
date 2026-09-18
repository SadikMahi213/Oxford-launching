from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field


AllowedAdminUserStatus = Literal["pending", "approved", "rejected", "issue"]


class UpdateKYCStatusRequest(BaseModel):
    status: AllowedAdminUserStatus
    issue_note: Optional[str] = Field(default=None, max_length=1000)
    admin_note: Optional[str] = Field(default=None, max_length=2000)


class CreditProfitRequest(BaseModel):
    profit_amount: Decimal = Field(..., gt=0)


class UpdateWalletBalancesRequest(BaseModel):
    main_wallet: Optional[Decimal] = Field(default=None, ge=0)
    deposit_wallet: Optional[Decimal] = Field(default=None, ge=0)
    withdraw_wallet: Optional[Decimal] = Field(default=None, ge=0)
    referral_wallet: Optional[Decimal] = Field(default=None, ge=0)
    generation_wallet: Optional[Decimal] = Field(default=None, ge=0)
    arbx_wallet: Optional[Decimal] = Field(default=None, ge=0)
    arbx_mining_wallet: Optional[Decimal] = Field(default=None, ge=0)
    captcha_wallet: Optional[Decimal] = Field(default=None, ge=0)
    ad_view_wallet: Optional[Decimal] = Field(default=None, ge=0)
    ecommerce_wallet: Optional[Decimal] = Field(default=None, ge=0)


class BulkTogglePackagesRequest(BaseModel):
    package_ids: list[int] = Field(..., min_length=1)
    is_active: bool


class ConfigUpdate(BaseModel):
    value: str


class AdminUpdateUserProfile(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=100)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    username: Optional[str] = Field(default=None, max_length=100, min_length=3)
    email: Optional[str] = Field(default=None, max_length=255)
    mobile_number: Optional[str] = Field(default=None, max_length=20)
    date_of_birth: Optional[str] = Field(default=None, description="YYYY-MM-DD format")
    country_of_residence: Optional[str] = Field(default=None, max_length=100)
    residential_address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, max_length=100)
    state_province: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=20)
    gender: Optional[str] = Field(default=None, max_length=20)
    nationality: Optional[str] = Field(default=None, max_length=100)
    religion: Optional[str] = Field(default=None, max_length=50)
    marital_status: Optional[str] = Field(default=None, max_length=20)
    national_id_number: Optional[str] = Field(default=None, max_length=100)
    passport_number: Optional[str] = Field(default=None, max_length=100)


class AdminResetPassword(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)
