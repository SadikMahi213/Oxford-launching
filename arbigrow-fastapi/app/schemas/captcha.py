from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime


class CaptchaNextResponse(BaseModel):
    captcha_id: int
    captcha_image: str
    expires_at: datetime
    timer_seconds: int = 60


class CaptchaSubmitRequest(BaseModel):
    captcha_id: int
    user_input: str


class CaptchaSubmitResponse(BaseModel):
    success: bool
    earned: Decimal
    remaining_today: int
    new_balance: Decimal


class CaptchaStatsResponse(BaseModel):
    earn_per_captcha: Decimal
    daily_limit: int
    typed_today: int
    expired_today: int = 0
    remaining: int
    total_earned_today: Decimal
    total_earned_all: Decimal
