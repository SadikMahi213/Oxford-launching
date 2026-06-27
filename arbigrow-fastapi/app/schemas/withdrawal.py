from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


AllowedSourceWallet = Literal[
    "main_wallet",
]

AllowedWithdrawalStatus = Literal["approved", "rejected"]


class WithdrawalCreate(BaseModel):
    source_wallet: AllowedSourceWallet
    network_name: str = Field(min_length=2, max_length=100)
    amount: Decimal = Field(gt=0)
    destination_address: str = Field(min_length=5, max_length=255)
    note: str | None = Field(default=None, max_length=500)


class WithdrawalStatusUpdate(BaseModel):
    status: AllowedWithdrawalStatus
