from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.base import Base


class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    transaction_id = Column(String(16), unique=True, nullable=True, index=True)

    source_wallet = Column(String(50), nullable=False)
    withdrawal_method_id = Column(Integer, ForeignKey("withdrawal_methods.id"), nullable=True)
    method_type = Column(String(20), nullable=True)
    network_name = Column(String(100), nullable=True)
    amount = Column(Numeric(24, 14), nullable=False)
    charge = Column(Numeric(24, 14), nullable=True, default=0)
    destination_address = Column(String(255), nullable=False)
    account_type = Column(String(20), nullable=True)
    bank_info_id = Column(Integer, ForeignKey("bank_info.id"), nullable=True)
    note = Column(Text, nullable=True)

    status = Column(String(20), default="pending", nullable=False)
    # pending | approved | rejected

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])
    bank_info = relationship("BankInfo", foreign_keys=[bank_info_id])
