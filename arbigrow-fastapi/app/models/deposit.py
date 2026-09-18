from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.base import Base


class Deposit(Base):
    __tablename__ = "deposits"

    id = Column(Integer, primary_key=True, index=True)

<<<<<<< HEAD
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
=======
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0

    network_name = Column(String, nullable=False)
    amount = Column(Numeric(18, 6), nullable=False)

    txid = Column(String, nullable=False, unique=True)

<<<<<<< HEAD
    status = Column(String, default="pending", index=True)
    # pending | approved | rejected

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
=======
    status = Column(String, default="pending")
    # pending | approved | rejected

    created_at = Column(DateTime(timezone=True), server_default=func.now())
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0

    user = relationship("User")
