from app.core.base import Base
from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, func, Text
from sqlalchemy.orm import relationship

class FlashDeal(Base):
    __tablename__ = "flash_deals"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    banner_key = Column(String(500), nullable=True)
    discount_type = Column(String(20), nullable=False, default="percentage")
    discount_value = Column(Numeric(14, 2), nullable=False, default=0)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class FlashDealProduct(Base):
    __tablename__ = "flash_deal_products"
    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("flash_deals.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    deal_price = Column(Numeric(24, 14), nullable=True)
    quantity_limit = Column(Integer, nullable=True)
    sold_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
