from app.core.base import Base
from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(100), nullable=True, index=True)
    barcode = Column(String(100), nullable=True)
    price = Column(Numeric(24, 14), nullable=False, default=0)
    compare_at_price = Column(Numeric(24, 14), nullable=True)
    cost_price = Column(Numeric(24, 14), nullable=True)
    stock = Column(Integer, nullable=False, default=0)
    low_stock_threshold = Column(Integer, nullable=True, default=5)
    weight = Column(Numeric(10, 2), nullable=True)
    length = Column(Numeric(10, 2), nullable=True)
    width = Column(Numeric(10, 2), nullable=True)
    height = Column(Numeric(10, 2), nullable=True)
    image_key = Column(String(500), nullable=True)
    is_default = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    product = relationship("Product", backref="variants")
