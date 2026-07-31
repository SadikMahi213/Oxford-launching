from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field


AllowedSourceWallet = Literal[
    "main_wallet",
]

AllowedWithdrawalStatus = Literal["approved", "rejected"]


class WithdrawalCreate(BaseModel):
    source_wallet: AllowedSourceWallet
    withdrawal_method_id: int = Field(...)
    amount: Decimal = Field(gt=0)
    destination_address: Optional[str] = Field(default=None, max_length=255)
    account_type: Optional[str] = Field(default=None, max_length=20)
    use_bank_info: bool = False
    note: Optional[str] = Field(default=None, max_length=500)


class WithdrawalStatusUpdate(BaseModel):
    status: AllowedWithdrawalStatus
