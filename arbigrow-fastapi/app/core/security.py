import hashlib
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.core.config import settings
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer

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
