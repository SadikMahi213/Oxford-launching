from redis.asyncio import Redis
from app.core.config import settings

redis: Redis | None = None


async def init_redis() -> Redis | None:
    global redis
    if not settings.REDIS_URL:
        return None
    try:
        redis = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=3,
            retry_on_timeout=True,
        )
        await redis.ping()
        return redis
    except Exception:
        redis = None
        return None


async def close_redis() -> None:
    global redis
    if redis is not None:
        await redis.close()
        redis = None


def get_redis() -> Redis | None:
    return redis
