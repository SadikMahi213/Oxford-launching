from pydantic import BaseModel, Field
from decimal import Decimal


class BuyInvestmentRequest(BaseModel):
    package_name: str
    amount: Decimal = Field(ge=0)


class BuyInvestmentResponse(BaseModel):
    id: int
    package_name: str
    invested_amount: Decimal
    roi_percent: Decimal
    expected_profit: Decimal
    status: str
    deposit_wallet_balance: Decimal


class AddProfitRequest(BaseModel):
    percentage: Decimal = Field(gt=0)
