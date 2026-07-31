import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security_log import SecurityLog


logger = logging.getLogger(__name__)


class SecurityLogger:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        event_type: str,
        user_id: int | None = None,
        email: str | None = None,
        ip_address: str | None = None,
        device: str | None = None,
        details: str | None = None,
    ):
        log_entry = SecurityLog(
            event_type=event_type,
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            device=device,
            details=details,
        )
        self.db.add(log_entry)
        await self.db.commit()
        logger.info("Security [%s] user=%s email=%s ip=%s device=%s",
                     event_type, user_id, email, ip_address, device)
