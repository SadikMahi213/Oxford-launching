from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

VALID_PACKAGES = Literal[
    "Starter Package",
    "Growth Package",
    "Advanced Package",
    "Pro Package",
    "Elite Package",
    "VIP Package",
]

ALL_PACKAGE_NAMES = [
    "Starter Package",
    "Growth Package",
    "Advanced Package",
    "Pro Package",
    "Elite Package",
    "VIP Package",
]


class ROISettingUpdate(BaseModel):
<<<<<<< HEAD
    percentage: Decimal = Field(..., ge=0, le=5)
=======
    percentage: Decimal = Field(..., ge=1, le=5)
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0


class ROIPackageApply(BaseModel):
    package_name: str = Field(..., min_length=1, max_length=100)
    percentage: Decimal = Field(..., ge=Decimal("0.01"), le=Decimal("25"))
