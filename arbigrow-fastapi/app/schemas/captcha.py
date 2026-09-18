from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime


class CaptchaNextResponse(BaseModel):
    captcha_id: int
    captcha_image: str
    expires_at: datetime
<<<<<<< HEAD
    timer_seconds: int = 60
=======
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0


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
<<<<<<< HEAD
    expired_today: int = 0
=======
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
    remaining: int
    total_earned_today: Decimal
    total_earned_all: Decimal
