from app.core.base import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func


class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    admin_note = Column(Text, nullable=True)
    refund_amount = Column(Numeric(12, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
