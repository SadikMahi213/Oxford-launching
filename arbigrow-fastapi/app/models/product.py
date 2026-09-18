import json
from app.core.base import Base
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Boolean, DateTime, Text, func


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False, index=True)
    name = Column(String(300), nullable=False)
    description = Column(String(2000), nullable=True)
    price = Column(Numeric(24, 14), nullable=False, default=0)
    image_url = Column(String(500), nullable=True)
    image_urls = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    arbx_allocated = Column(Numeric(24, 14), nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    sku = Column(String(100), nullable=True)
    stock_quantity = Column(Integer, nullable=False, default=0)
    discount_price = Column(Numeric(24, 14), nullable=True)
    attributes = Column(Text, nullable=True)
    shipping_info = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def get_image_urls(self):
        if self.image_urls:
            try:
                return json.loads(self.image_urls)
            except (json.JSONDecodeError, TypeError):
                pass
        if self.image_url:
            return [self.image_url]
        return []

    def set_image_urls(self, urls):
        self.image_urls = json.dumps(urls) if urls else None
