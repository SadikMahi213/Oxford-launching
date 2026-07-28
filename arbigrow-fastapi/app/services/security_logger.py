from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Column, Integer, String, DateTime, Text, func
from app.core.base import Base
from app.core.database import async_session


class SecurityLog(Base):
    __tablename__ = "security_logs"

    id: int = Column(Integer, primary_key=True, index=True)
    event_type: str = Column(String(50), nullable=False, index=True)
    user_id: int = Column(Integer, nullable=True, index=True)
    email: str = Column(String(255), nullable=True)
    ip_address: str = Column(String(45), nullable=True)
    device: str = Column(String(255), nullable=True)
    details: str = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SecurityLogger:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(self, event_type: str, user_id: int = None, email: str = None,
                  ip_address: str = None, device: str = None, details: str = None):
        log_entry = SecurityLog(
            event_type=event_type,
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            device=device,
            details=details,
        )
        self.db.add(log_entry)
