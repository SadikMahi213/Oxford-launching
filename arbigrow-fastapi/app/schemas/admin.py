from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal


class CreditProfitRequest(BaseModel):
    profit_amount: Decimal = Field(..., gt=0)


class UpdateWalletBalancesRequest(BaseModel):
    main_wallet: Optional[Decimal] = None
    deposit_wallet: Optional[Decimal] = None
    withdraw_wallet: Optional[Decimal] = None
    referral_wallet: Optional[Decimal] = None
    generation_wallet: Optional[Decimal] = None
    arbx_wallet: Optional[Decimal] = None
    arbx_mining_wallet: Optional[Decimal] = None
    captcha_wallet: Optional[Decimal] = None
    ad_view_wallet: Optional[Decimal] = None
    ecommerce_wallet: Optional[Decimal] = None


class UpdateKYCStatusRequest(BaseModel):
    status: str
    admin_note: Optional[str] = None
    issue_note: Optional[str] = None
