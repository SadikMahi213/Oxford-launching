from app.models.notification import AdminNotification


async def notify_admin(db, type: str, message: str, user_id: int | None = None, request=None):
    """Log an admin notification."""
    notification = AdminNotification(
        type=type,
        message=message,
        user_id=user_id,
    )
    db.add(notification)
