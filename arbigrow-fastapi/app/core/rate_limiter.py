from fastapi import Request
from slowapi import Limiter


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"


limiter = Limiter(
    key_func=_get_client_ip,
    default_limits=["100/minute"]
)
