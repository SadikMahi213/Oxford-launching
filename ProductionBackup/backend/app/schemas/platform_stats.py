from pydantic import BaseModel
from decimal import Decimal


class PlatformStatsCreate(BaseModel):
    total_users: int
    total_invested: Decimal
    total_withdrawn: Decimal
    total_profit_shared: Decimal
    active_investors: int


class PlatformStatsUpdate(BaseModel):
    total_users: int | None = None
    total_invested: Decimal | None = None
    total_withdrawn: Decimal | None = None
    total_profit_shared: Decimal | None = None
    active_investors: int | None = None


class PlatformStatsResponse(BaseModel):
    id: int
    total_users: int
    total_invested: Decimal
    total_withdrawn: Decimal
    total_profit_shared: Decimal
    active_investors: int

    class Config:
        from_attributes = True
