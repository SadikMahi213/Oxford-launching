import hashlib
import json
from typing import Any, Callable

from cachetools import TTLCache

from app.core.redis import get_redis


config_cache = TTLCache(maxsize=1000, ttl=30)
user_cache = TTLCache(maxsize=5000, ttl=10)


def _make_key(fn_name: str, kwargs: dict) -> str:
    raw = json.dumps(kwargs, sort_keys=True, default=str)
    return f"cache:{fn_name}:{hashlib.md5(raw.encode()).hexdigest()}"


def cached(ttl: int = 30):
    def decorator(fn: Callable):
        from functools import wraps
        from sqlalchemy.ext.asyncio import AsyncSession

        @wraps(fn)
        async def wrapper(*args, **kwargs):
            clean = {k: v for k, v in kwargs.items() if not isinstance(v, AsyncSession)}
            cache_key = _make_key(fn.__name__, clean)
            r = get_redis()
            if r is not None:
                try:
                    val = await r.get(cache_key)
                    if val is not None:
                        return json.loads(val)
                except Exception:
                    pass
            result = config_cache.get(cache_key)
            if result is not None:
                return result
            result = await fn(*args, **kwargs)
            config_cache[cache_key] = result
            if r is not None:
                try:
                    await r.setex(cache_key, ttl, json.dumps(result, default=str))
                except Exception:
                    pass
            return result
        return wrapper
    return decorator
