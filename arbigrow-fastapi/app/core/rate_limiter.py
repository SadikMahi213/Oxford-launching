from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

def _user_or_ip_key(request):
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            from jose import jwt
            payload = jwt.decode(auth[7:], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            uid = payload.get("sub")
            if uid:
                return f"user:{uid}"
        except Exception:
            pass
    return get_remote_address(request)

import logging

_logger = logging.getLogger(__name__)

# Try Redis; fall back to in-memory if Redis is not running locally
_storage_uri = None
if settings.REDIS_URL and settings.REDIS_URL.startswith("redis://"):
    try:
        import redis as _redis
        _client = _redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        _client.ping()
        _storage_uri = settings.REDIS_URL
        _logger.info("Rate limiter using Redis storage")
    except Exception:
        _logger.warning("Redis not available — rate limiter falling back to in-memory storage")

limiter = Limiter(
    key_func=_user_or_ip_key,
    default_limits=["100/minute"],
    storage_uri=_storage_uri,  # None = in-memory
)
