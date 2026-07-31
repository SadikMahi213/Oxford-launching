from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text
from sqlalchemy.sql import func
from app.core.base import Base


class WithdrawalMethod(Base):
    __tablename__ = "withdrawal_methods"

    id = Column(Integer, primary_key=True, index=True)
    method_type = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    display_name = Column(String(200), nullable=False)
    wallet_address = Column(String(255), nullable=True)
    instructions = Column(Text, nullable=True)
    min_amount = Column(Numeric(24, 14), nullable=True, default=10)
    max_amount = Column(Numeric(24, 14), nullable=True, default=700)
    fixed_fee = Column(Numeric(24, 14), nullable=True, default=0)
    percent_fee = Column(Numeric(5, 2), nullable=True, default=0)
    status = Column(Boolean, default=True, index=True)
    date_created = Column(DateTime(timezone=True), server_default=func.now())
