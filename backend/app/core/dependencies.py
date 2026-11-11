"""Dependensi bersama untuk sesi database, autentikasi JWT, dan otorisasi RBAC."""

from typing import Callable, Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    """Menyediakan sesi database SQLAlchemy per request dan menutupnya setelah selesai."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Mengambil user yang sedang login berdasarkan Bearer JWT token."""
    unauthorized_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autentikasi diperlukan atau token tidak valid.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized_exc

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (JWTError, ValueError, TypeError):
        raise unauthorized_exc

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized_exc

    return user


def require_roles(*allowed_roles: UserRole) -> Callable[[User], User]:
    """Membuat dependency RBAC untuk membatasi akses endpoint hanya bagi peran tertentu."""
    allowed_values = {
        role.value if isinstance(role, UserRole) else str(role)
        for role in allowed_roles
    }

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = (
            current_user.role.value
            if isinstance(current_user.role, UserRole)
            else str(current_user.role)
        )
        if user_role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Anda tidak memiliki hak akses untuk fitur ini.",
            )
        return current_user

    return role_checker
