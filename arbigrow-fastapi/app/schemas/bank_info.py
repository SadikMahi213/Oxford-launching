from decimal import Decimal
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class BankInfoCreate(BaseModel):
    account_holder_name: str = Field(min_length=1, max_length=255)
    bank_name: str = Field(min_length=1, max_length=255)
    account_number: str = Field(min_length=1, max_length=255)
    branch_name: str = Field(min_length=1, max_length=255)
    branch_address: str = Field(min_length=1, max_length=1000)
    swift_code: str = Field(min_length=1, max_length=50)
    routing_code: Optional[str] = Field(default=None, max_length=50)
    country: str = Field(min_length=1, max_length=100)
    currency: str = Field(min_length=1, max_length=10)
    account_type: str = Field(min_length=1, max_length=50)


class BankInfoUpdate(BaseModel):
    status: str
    admin_note: Optional[str] = Field(default=None, max_length=2000)


class BankInfoResponse(BaseModel):
    id: int
    user_id: int
    user_no: Optional[str] = None
    account_holder_name: str
    bank_name: str
    account_number: str
    branch_name: str
    branch_address: str
    swift_code: str
    routing_code: Optional[str] = None
    country: str
    currency: str
    account_type: str
    status: str
    admin_note: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
