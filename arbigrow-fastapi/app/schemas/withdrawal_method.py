from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from typing import Optional


class WithdrawalMethodCreate(BaseModel):
    method_type: str
    name: str
    display_name: str
    wallet_address: Optional[str] = None
    instructions: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    fixed_fee: Optional[Decimal] = None
    percent_fee: Optional[Decimal] = None
    status: bool = True


class WithdrawalMethodResponse(BaseModel):
    id: int
    method_type: str
    name: str
    display_name: str
    wallet_address: Optional[str] = None
    instructions: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    fixed_fee: Optional[Decimal] = None
    percent_fee: Optional[Decimal] = None
    status: bool
    date_created: datetime

    class Config:
        from_attributes = True


class WithdrawalMethodUpdate(BaseModel):
    method_type: Optional[str] = None
    name: Optional[str] = None
    display_name: Optional[str] = None
    wallet_address: Optional[str] = None
    instructions: Optional[str] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    fixed_fee: Optional[Decimal] = None
    percent_fee: Optional[Decimal] = None
    status: Optional[bool] = None
