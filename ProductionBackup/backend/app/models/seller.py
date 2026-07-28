from app.core.base import Base
from sqlalchemy import Column, Integer, String, Numeric, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship


class Seller(Base):
    __tablename__ = "sellers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    store_name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    status = Column(String(20), nullable=False, default="draft")

    phone = Column(String(30), nullable=True)
    whatsapp_number = Column(String(30), nullable=True)
    nid_number = Column(String(100), nullable=True)
    nid_front_image_key = Column(String(500), nullable=True)
    nid_back_image_key = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    division_state = Column(String(100), nullable=True)
    district_city = Column(String(100), nullable=True)
    full_address = Column(Text, nullable=True)
    store_logo_key = Column(String(500), nullable=True)
    store_banner_key = Column(String(500), nullable=True)
    facebook_url = Column(String(500), nullable=True)
    youtube_url = Column(String(500), nullable=True)
    tiktok_url = Column(String(500), nullable=True)
    website_url = Column(String(500), nullable=True)
    profile_completion = Column(Numeric(5, 2), default=0, nullable=True)
    rejection_reason = Column(String(1000), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    default_delivery_charge = Column(Numeric(10, 2), default=0, nullable=True)
    shipping_settings = Column(Text, nullable=True)
    return_policy = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="sellers", uselist=True)
