from pydantic import BaseModel
<<<<<<< HEAD


class PlatformStatsCreate(BaseModel):
    total_users: str = "0"
    total_invested: str = "0"
    total_withdrawn: str = "0"
    total_profit_shared: str = "0"
    active_investors: str = "0"


class PlatformStatsUpdate(BaseModel):
    total_users: str | None = None
    total_invested: str | None = None
    total_withdrawn: str | None = None
    total_profit_shared: str | None = None
    active_investors: str | None = None
=======
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
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0


class PlatformStatsResponse(BaseModel):
    id: int
<<<<<<< HEAD
    total_users: str
    total_invested: str
    total_withdrawn: str
    total_profit_shared: str
    active_investors: str
=======
    total_users: int
    total_invested: Decimal
    total_withdrawn: Decimal
    total_profit_shared: Decimal
    active_investors: int
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0

    class Config:
        from_attributes = True
