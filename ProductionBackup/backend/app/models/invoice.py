from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    invoice_type = Column(String(50), nullable=False)
    # daily | weekly | monthly | deposit | withdrawal | statement

    invoice_number = Column(String(64), unique=True, nullable=False, index=True)

    transaction_id = Column(String(16), unique=True, nullable=False, index=True)

    amount = Column(Numeric(24, 14), nullable=True)
    currency = Column(String(10), default="USDT")
    status = Column(String(20), default="generated")

    description = Column(Text, nullable=True)
    pdf_url = Column(String(500), nullable=True)
    pdf_storage_key = Column(String(255), nullable=True)

    # For linking to specific transactions
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(50), nullable=True)
    # deposit | withdrawal | investment

    # Period covered (for date-range invoices)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    emailed = Column(String(20), default="no")
    # no | sent | failed

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
