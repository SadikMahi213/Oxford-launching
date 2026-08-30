from pydantic import BaseModel


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


class PlatformStatsResponse(BaseModel):
    id: int
    total_users: str
    total_invested: str
    total_withdrawn: str
    total_profit_shared: str
    active_investors: str

    class Config:
        from_attributes = True
