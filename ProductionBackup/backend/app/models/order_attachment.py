from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.base import Base

class OrderAttachment(Base):
    __tablename__ = "order_attachments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    file_name = Column(String(500), nullable=False)
    file_key = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False, default="customer_document")
    uploaded_by = Column(String(20), nullable=False, default="customer")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
