from pydantic import BaseModel
from decimal import Decimal


class DepositCreate(BaseModel):

    network_name: str
    amount: Decimal
    txid: str


class DepositStatusUpdate(BaseModel):

    status: str
