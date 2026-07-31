from app.core.base import Base
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func

class ProductTag(Base):
    __tablename__ = "product_tags"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    tag = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
