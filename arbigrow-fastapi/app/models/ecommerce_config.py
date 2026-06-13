from app.core.base import Base
from sqlalchemy import Column, Integer, Numeric


class EcommerceConfig(Base):
    __tablename__ = "ecommerce_config"

    id = Column(Integer, primary_key=True, index=True)
    signup_bonus_arbx = Column(Numeric(24, 14), nullable=False, default=50)
