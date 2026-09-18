from app.core.base import Base
from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, func


class DeliveryZone(Base):
    __tablename__ = "delivery_zones"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False, index=True)
    zone_name = Column(String(200), nullable=False)
    delivery_charge = Column(Numeric(24, 14), nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
