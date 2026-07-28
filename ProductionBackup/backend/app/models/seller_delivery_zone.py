from app.core.base import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, func


class SellerDeliveryZone(Base):
    __tablename__ = "seller_delivery_zones"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("admin_delivery_zones.id"), nullable=False, index=True)
    delivery_charge = Column(Numeric(12, 2), nullable=True)
    free_delivery_threshold = Column(Numeric(12, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
