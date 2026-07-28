"""Cache abstraction layer.

Currently provides an in-memory fallback. When Redis is deployed (Phase 4),
swap get_backend() to return a Redis-backed implementation.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional


class MemoryCache:
    """Simple in-memory cache (TTL-based). Replace with Redis for production."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, datetime]] = {}

    async def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if datetime.now(timezone.utc) > expires_at:
            del self._store[key]
            return None
        return value

    async def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
        self._store[key] = (value, expires_at)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def clear(self) -> None:
        self._store.clear()


_cache = MemoryCache()


async def get_cached(key: str) -> Any | None:
    return await _cache.get(key)


async def set_cached(key: str, value: Any, ttl_seconds: int = 300) -> None:
    await _cache.set(key, value, ttl_seconds)


async def invalidate_cache(key: str) -> None:
    await _cache.delete(key)


async def cached(ttl_seconds: int = 300):
    """Decorator: caches the return value of an async callable."""
    def decorator(func: Callable) -> Callable:
        async def wrapper(*args, **kwargs) -> Any:
            cache_key = f"{func.__module__}:{func.__name__}:{hash(frozenset(kwargs.items()))}"
            result = await get_cached(cache_key)
            if result is not None:
                return result
            result = await func(*args, **kwargs)
            await set_cached(cache_key, result, ttl_seconds)
            return result
        return wrapper
    return decorator
