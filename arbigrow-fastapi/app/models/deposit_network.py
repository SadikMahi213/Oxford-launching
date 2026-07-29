from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.base import Base


class DepositNetwork(Base):
    __tablename__ = "deposit_networks"

    id = Column(Integer, primary_key=True, index=True)
    network_name = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    wallet_address = Column(String, nullable=False)
    status = Column(Boolean, default=True)

    date_created = Column(DateTime(timezone=True), server_default=func.now())
