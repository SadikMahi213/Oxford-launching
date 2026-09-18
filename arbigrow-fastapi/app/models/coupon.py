from app.core.base import Base
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, func, Text, ForeignKey

class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    discount_type = Column(String(20), nullable=False, default="percentage")
    discount_value = Column(Numeric(14, 2), nullable=False, default=0)
    minimum_order_amount = Column(Numeric(24, 14), nullable=True, default=0)
    maximum_discount = Column(Numeric(24, 14), nullable=True)
    usage_limit = Column(Integer, nullable=True)
    usage_limit_per_user = Column(Integer, nullable=True, default=1)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    applies_to = Column(String(50), nullable=True)
    applies_value = Column(String(500), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class CouponUsage(Base):
    __tablename__ = "coupon_usages"
    id = Column(Integer, primary_key=True, index=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    used_at = Column(DateTime(timezone=True), server_default=func.now())
