from app.core.base import Base
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, func

class CommissionRule(Base):
    __tablename__ = "commission_rules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    commission_type = Column(String(20), nullable=False, default="percentage")
    commission_value = Column(Numeric(14, 2), nullable=False, default=0)
    applies_to = Column(String(50), nullable=True)
    applies_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
