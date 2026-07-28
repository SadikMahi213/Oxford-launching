import hashlib
import secrets
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.core.config import settings
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _pre_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(_pre_hash(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_pre_hash(plain_password), hashed_password)


def create_access_token(data: dict, expires_minutes: int | None = None) -> str:
    to_encode = data.copy()

    if expires_minutes:
        expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    to_encode.update({"jti": secrets.token_hex(16)})

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )


def _decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def _extract_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth.split(" ", 1)[1]
    return request.cookies.get("access_token")


async def get_current_user_id(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
) -> int:
    raw = token or _extract_token(request)
    if not raw:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = _decode_token(raw)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    jti = payload.get("jti")
    if jti:
        from app.core.database import AsyncSessionLocal
        from app.models.token_blacklist import TokenBlacklist
        from sqlalchemy import select
        async with AsyncSessionLocal() as check_db:
            existing = await check_db.execute(
                select(TokenBlacklist).where(TokenBlacklist.jti == jti).limit(1)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=401, detail="Token has been revoked")

    return int(user_id)


def verify_password_reset_token(token: str) -> int:
    payload = _decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("type") != "password_reset":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return int(user_id)


def generate_refresh_token() -> tuple[str, str]:
    raw = secrets.token_hex(32)
    hashed = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, hashed


def compute_refresh_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def blacklist_access_token(token: str, db: AsyncSession) -> None:
    from app.models.token_blacklist import TokenBlacklist
    payload = _decode_token(token)
    if payload is None:
        return
    jti = payload.get("jti") or hashlib.sha256(token.encode("utf-8")).hexdigest()
    exp = payload.get("exp")
    if exp is None:
        return
    expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
    existing = await db.execute(select(TokenBlacklist).where(TokenBlacklist.jti == jti))
    if existing.scalar_one_or_none():
        return
    db.add(TokenBlacklist(jti=jti, expires_at=expires_at))
    await db.commit()
