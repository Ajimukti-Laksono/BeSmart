"""Utilitas keamanan untuk hashing password (bcrypt) dan manajemen token JWT."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Memverifikasi kesesuaian password plaintext dengan hash bcrypt tersimpan."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Menghasilkan hash bcrypt yang aman dari password plaintext."""
    return pwd_context.hash(password)


def create_access_token(
    subject: str | int,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Membuat token JWT berisi user ID (sub), role pengguna, dan waktu kedaluwarsa."""
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Mendekode dan memvalidasi signature serta masa berlaku token JWT.

    Raises:
        JWTError: Jika token tidak valid, rusak, atau sudah kedaluwarsa.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    if "sub" not in payload:
        raise JWTError("Payload token tidak memiliki klaim 'sub'.")
    return payload

