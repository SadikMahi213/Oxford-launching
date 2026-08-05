from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class WalletTransactionResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    type: str
    wallet_type: str
    amount: Decimal
    balance_before: Optional[Decimal] = None
    balance_after: Optional[Decimal] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {Decimal: lambda v: format(v, ".14f")}


class CompanyWalletResponse(BaseModel):
    total_kyc_collected: Decimal

    class Config:
        from_attributes = True
        json_encoders = {Decimal: lambda v: format(v, ".14f")}
