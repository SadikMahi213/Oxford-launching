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
