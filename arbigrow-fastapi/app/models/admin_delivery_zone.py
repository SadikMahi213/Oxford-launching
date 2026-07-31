from app.core.base import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, func


class AdminDeliveryZone(Base):
    __tablename__ = "admin_delivery_zones"

    id = Column(Integer, primary_key=True, index=True)
    zone_name = Column(String(200), nullable=False)
    country = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True, index=True)
    district = Column(String(100), nullable=True, index=True)
    city = Column(String(100), nullable=True, index=True)
    area = Column(String(200), nullable=True)
    postal_code = Column(String(20), nullable=True)
    delivery_charge = Column(Numeric(12, 2), nullable=False, default=0)
    free_delivery_threshold = Column(Numeric(12, 2), nullable=True)
    estimated_days = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
