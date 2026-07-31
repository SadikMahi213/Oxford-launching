from app.core.base import Base
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, Text, func


class OrderStatusLog(Base):
    __tablename__ = "order_status_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=False)
    changed_by = Column(String(20), nullable=True)
    changed_by_id = Column(Integer, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
