from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.base import Base


class AdminNotification(Base):
    __tablename__ = "admin_notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    priority = Column(String(20), default="normal", index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    device = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    user = relationship("User", backref="admin_notifications", lazy="select")

    @property
    def user_no(self) -> str | None:
        return self.user.user_no if self.user else None

    __table_args__ = (
        Index("ix_notifications_unread_created", "is_read", "created_at"),
    )
