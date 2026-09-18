from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.base import Base


class BankInfo(Base):
    __tablename__ = "bank_info"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    account_holder_name = Column(String(255), nullable=False)
    bank_name = Column(String(255), nullable=False)
    account_number = Column(String(255), nullable=False)
    branch_name = Column(String(255), nullable=False)
    branch_address = Column(Text, nullable=False)
    swift_code = Column(String(50), nullable=False)
    routing_code = Column(String(50), nullable=True)
    country = Column(String(100), nullable=False)
    currency = Column(String(10), nullable=False)
    account_type = Column(String(50), nullable=False)

    status = Column(String(20), nullable=False, default="pending")
    admin_note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", backref="bank_info", lazy="select")

    @property
    def user_no(self) -> str | None:
        return self.user.user_no if self.user else None
