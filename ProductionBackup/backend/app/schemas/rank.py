from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
from typing import Optional


class BonusConfigItem(BaseModel):
    bonus_type: str = Field(..., max_length=50)
    bonus_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=4)
    sort_order: int = 0


class BonusConfigResponse(BonusConfigItem):
    id: int
    rank_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RankBase(BaseModel):
    name: str
    slug: str
    sort_order: int
    target_volume: Decimal = Field(default=Decimal("0"))
    max_matching_percent: Decimal = Field(default=Decimal("100"), max_digits=8, decimal_places=4)
    is_active: bool = True
    description: Optional[str] = None


class RankCreate(RankBase):
    bonus_configs: list[BonusConfigItem] = []


class RankUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    sort_order: Optional[int] = None
    target_volume: Optional[Decimal] = None
    max_matching_percent: Optional[Decimal] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    bonus_configs: Optional[list[BonusConfigItem]] = None


class RankResponse(RankBase):
    id: int
    created_at: datetime
    updated_at: datetime
    bonus_configs: list[BonusConfigResponse] = []

    model_config = {"from_attributes": True}


class RankHistoryResponse(BaseModel):
    id: int
    user_id: int
    user_no: Optional[str] = None
    rank_id: int
    previous_rank_id: Optional[int] = None
    team_volume: Decimal
    status: str
    achieved_at: datetime
    released_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MatchingBonusResponse(BaseModel):
    id: int
    user_id: int
    user_no: Optional[str] = None
    source_user_id: Optional[int] = None
    source_user_no: Optional[str] = None
    rank_id: int
    bonus_type: str
    eligible_amount: Decimal
    bonus_percent: Decimal
    bonus_amount: Decimal
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


BONUS_TYPES = [
    "matching",
    "extra",
    "travel",
    "company_profit",
    "development",
    "international",
    "position",
]
