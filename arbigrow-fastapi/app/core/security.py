import hashlib
import secrets
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.core.config import settings
from app.core.database import get_db
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

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
    db: AsyncSession = Depends(get_db),
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
        # Reuse the request DB session (same instance FastAPI already
        # resolved for this request) instead of opening a second session.
        from app.models.token_blacklist import TokenBlacklist
        existing = await db.execute(
            select(TokenBlacklist).where(TokenBlacklist.jti == jti).limit(1)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=401, detail="Token has been revoked")

    return int(user_id)


def generate_refresh_token() -> tuple[str, str]:
    raw = secrets.token_hex(32)
    hashed = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, hashed


def compute_refresh_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ── Persistent session (refresh token) helpers ─────────────────────────────
# The httpOnly `refresh_token` cookie keeps the user logged in across page
# refreshes, browser restarts and access-token expirations. Access tokens stay
# short-lived (60 min); only the refresh endpoint can mint new ones, and every
# successful refresh slides the expiry forward (bounded by
# REFRESH_TOKEN_EXPIRE_DAYS of inactivity). Explicit logout revokes the token.

def refresh_token_expiry(days: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


async def issue_refresh_token(db: AsyncSession, user_id: int, days: int) -> str:
    """Create + persist a refresh token. Returns the raw (cookie) value."""
    from app.models.refresh_token import RefreshToken
    raw, hashed = generate_refresh_token()
    db.add(RefreshToken(
        user_id=user_id,
        token_hash=hashed,
        expires_at=refresh_token_expiry(days),
        revoked=False,
    ))
    await db.commit()
    return raw


async def validate_refresh_token(db: AsyncSession, raw: str, days: int) -> int | None:
    """Return user_id for a live refresh token (sliding expiry), else None.

    Revoked/expired/unknown tokens return None without side effects, so a
    failed refresh never destroys anything — the caller decides.
    """
    from app.models.refresh_token import RefreshToken
    if not raw:
        return None
    hashed = compute_refresh_token_hash(raw)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hashed).limit(1)
    )
    record = result.scalar_one_or_none()
    if record is None or record.revoked:
        return None
    expires_at = record.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at is not None and expires_at <= datetime.now(timezone.utc):
        return None
    # Sliding window: activity extends the session up to `days` of inactivity.
    record.expires_at = refresh_token_expiry(days)
    await db.commit()
    return record.user_id


async def revoke_refresh_token(db: AsyncSession, raw: str) -> None:
    """Best-effort revoke of one refresh token (explicit logout path)."""
    from app.models.refresh_token import RefreshToken
    if not raw:
        return
    hashed = compute_refresh_token_hash(raw)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hashed).limit(1)
    )
    record = result.scalar_one_or_none()
    if record is not None and not record.revoked:
        record.revoked = True
        await db.commit()


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
