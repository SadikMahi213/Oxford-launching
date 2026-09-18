import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import AdminNotification


class NotificationEventBus:
    _queues: list[asyncio.Queue] = []

    @classmethod
    def subscribe(cls) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        cls._queues.append(q)
        return q

    @classmethod
    def unsubscribe(cls, q: asyncio.Queue):
        if q in cls._queues:
            cls._queues.remove(q)

    @classmethod
    async def publish(cls, notification: AdminNotification):
        data = {
            "id": notification.id,
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "priority": notification.priority,
            "user_id": notification.user_id,
            "created_at": notification.created_at.isoformat() + "Z" if notification.created_at else None,
        }
        payload = json.dumps(data)
        dead = []
        for q in cls._queues:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            cls._queues.remove(q)


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_notification(
        self,
        type: str,
        title: str,
        message: Optional[str] = None,
        priority: str = "normal",
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        device: Optional[str] = None,
        metadata_dict: Optional[dict] = None,
    ) -> AdminNotification:
        cutoff = datetime.utcnow() - timedelta(minutes=5)
        stmt = select(AdminNotification).where(
            AdminNotification.type == type,
            AdminNotification.user_id == user_id,
            AdminNotification.created_at > cutoff,
        ).limit(1)
        result = await self.db.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        notification = AdminNotification(
            type=type,
            title=title,
            message=message,
            priority=priority,
            user_id=user_id,
            ip_address=ip_address,
            device=device,
            metadata_json=json.dumps(metadata_dict) if metadata_dict else None,
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        await NotificationEventBus.publish(notification)
        return notification

    async def get_unread_count(self) -> int:
        stmt = select(func.count(AdminNotification.id)).where(
            AdminNotification.is_read == False
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def get_notifications(
        self,
        page: int = 1,
        per_page: int = 20,
        is_read: Optional[bool] = None,
        type: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
    ) -> dict:
        conditions = []
        if is_read is not None:
            conditions.append(AdminNotification.is_read == is_read)
        if type:
            conditions.append(AdminNotification.type == type)
        if priority:
            conditions.append(AdminNotification.priority == priority)
        if search:
            conditions.append(
                or_(
                    AdminNotification.title.ilike(f"%{search}%"),
                    AdminNotification.message.ilike(f"%{search}%"),
                )
            )

        base = select(AdminNotification).options(joinedload(AdminNotification.user))
        if conditions:
            base = base.where(and_(*conditions))

        count_q = select(func.count()).select_from(base.subquery())
        total_result = await self.db.execute(count_q)
        total = total_result.scalar() or 0

        total_pages = max(1, (total + per_page - 1) // per_page)

        stmt = (
            base.order_by(AdminNotification.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        result = await self.db.execute(stmt)
        items = result.scalars().all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }

    async def mark_as_read(self, notification_id: int) -> bool:
        stmt = select(AdminNotification).where(AdminNotification.id == notification_id)
        result = await self.db.execute(stmt)
        notification = result.scalar_one_or_none()
        if not notification:
            return False
        notification.is_read = True
        await self.db.commit()
        return True

    async def mark_all_as_read(self) -> int:
        stmt = select(AdminNotification).where(AdminNotification.is_read == False)
        result = await self.db.execute(stmt)
        notifications = result.scalars().all()
        count = len(notifications)
        for n in notifications:
            n.is_read = True
        await self.db.commit()
        return count

    async def get_recent(self, limit: int = 5) -> list[AdminNotification]:
        stmt = (
            select(AdminNotification)
            .options(joinedload(AdminNotification.user))
            .order_by(AdminNotification.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
