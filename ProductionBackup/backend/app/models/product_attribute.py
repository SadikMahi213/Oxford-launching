from app.core.base import Base
from sqlalchemy import Column, Integer, String, DateTime, func

class ProductAttribute(Base):
    __tablename__ = "product_attributes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
