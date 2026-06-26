from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
from typing import Optional


class RankBase(BaseModel):
    name: str
    slug: str
    sort_order: int
    target_volume: Decimal = Field(default=Decimal("0"))
    matching_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=4)
    extra_bonus_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=4)
    travel_bonus_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=4)
    company_profit_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=4)
    development_bonus_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=4)
    international_bonus_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=4)
    position_bonus_percent: Decimal = Field(default=Decimal("0"), max_digits=8, decimal_places=4)
    max_matching_percent: Decimal = Field(default=Decimal("100"), max_digits=8, decimal_places=4)
    is_active: bool = True
    description: Optional[str] = None


class RankCreate(RankBase):
    pass


class RankUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    sort_order: Optional[int] = None
    target_volume: Optional[Decimal] = None
    matching_percent: Optional[Decimal] = None
    extra_bonus_percent: Optional[Decimal] = None
    travel_bonus_percent: Optional[Decimal] = None
    company_profit_percent: Optional[Decimal] = None
    development_bonus_percent: Optional[Decimal] = None
    international_bonus_percent: Optional[Decimal] = None
    position_bonus_percent: Optional[Decimal] = None
    max_matching_percent: Optional[Decimal] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class RankResponse(RankBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RankHistoryResponse(BaseModel):
    id: int
    user_id: int
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
    source_user_id: Optional[int] = None
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
