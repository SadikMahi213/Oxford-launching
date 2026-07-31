from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class DepositNetworkCreate(BaseModel):
    network_name: str
    display_name: str
    wallet_address: str
    status: bool = True


class DepositNetworkResponse(BaseModel):
    id: int
    network_name: str
    display_name: str
    wallet_address: str
    status: bool
    date_created: datetime

    class Config:
        from_attributes = True


class DepositNetworkUpdate(BaseModel):
    network_name: Optional[str] = None
    display_name: Optional[str] = None
    wallet_address: Optional[str] = None
    status: Optional[bool] = None
