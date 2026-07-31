from app.core.base import Base
from sqlalchemy import Column, Integer, ForeignKey, DateTime, func

class ProductView(Base):
    __tablename__ = "product_views"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())
