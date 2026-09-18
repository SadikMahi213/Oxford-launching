from app.core.base import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

class ProductAttributeValue(Base):
    __tablename__ = "product_attribute_values"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    attribute_id = Column(Integer, ForeignKey("product_attributes.id"), nullable=False)
    value = Column(String(200), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    attribute = relationship("ProductAttribute")
