from app.core.base import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False, index=True)
    total = Column(Numeric(24, 14), nullable=False, default=0)
    fee_percent = Column(Numeric(6, 2), nullable=True)
    fee_amount = Column(Numeric(24, 14), nullable=True, default=0)
    seller_payout = Column(Numeric(24, 14), nullable=True, default=0)
    delivery_charge = Column(Numeric(12, 2), nullable=True, default=0)
    commission_rate = Column(Numeric(6, 2), nullable=True)
    commission_amount = Column(Numeric(12, 2), nullable=True, default=0)
    net_amount = Column(Numeric(12, 2), nullable=True, default=0)
    status = Column(String(30), nullable=False, default="pending", index=True)
    payment_method = Column(String(20), nullable=False, default="cod")
    customer_name = Column(String(200), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_address = Column(String(500), nullable=False)
    shipping_address = Column(String(500), nullable=True)
    tracking_number = Column(String(200), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    refund_status = Column(String(20), nullable=True)
    refund_amount = Column(Numeric(12, 2), nullable=True, default=0)
    is_return_requested = Column(Boolean, nullable=False, default=False)
    return_reason = Column(Text, nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    price = Column(Numeric(24, 14), nullable=False, default=0)
