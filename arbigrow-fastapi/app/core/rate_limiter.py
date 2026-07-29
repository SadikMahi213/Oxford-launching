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

_storage_uri = settings.REDIS_URL if settings.REDIS_URL.startswith("redis://") else None

limiter = Limiter(
    key_func=_user_or_ip_key,
    default_limits=["100/minute"],
    storage_uri=_storage_uri,
)
