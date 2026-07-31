from app.core.base import Base
from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

class ShippingZone(Base):
    __tablename__ = "shipping_zones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    countries = Column(String(1000), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ShippingClass(Base):
    __tablename__ = "shipping_classes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(255), nullable=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ShippingRate(Base):
    __tablename__ = "shipping_rates"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("shipping_zones.id"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("shipping_classes.id"), nullable=True)
    method = Column(String(50), nullable=False, default="flat_rate")
    min_order_amount = Column(Numeric(24, 14), nullable=True, default=0)
    max_order_amount = Column(Numeric(24, 14), nullable=True)
    cost = Column(Numeric(24, 14), nullable=False, default=0)
    is_free_shipping = Column(Boolean, default=False)
    estimated_days = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    zone = relationship("ShippingZone", backref="rates")
