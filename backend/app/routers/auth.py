"""Router autentikasi pengguna: register, login JWT, dan profil akun aktif."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Autentikasi"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrasi akun mahasiswa baru",
)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Mendaftarkan akun mahasiswa baru dan mengembalikan token JWT."""
    normalized_email = payload.email.strip().lower()
    existing_user = db.scalar(select(User).where(User.email == normalized_email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar. Silakan gunakan email lain atau login.",
        )

    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=get_password_hash(payload.password),
        role=UserRole.MAHASISWA,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login pengguna dan terbitkan JWT",
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Memverifikasi kredensial email dan password lalu menerbitkan JWT Bearer token."""
    normalized_email = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password tidak sesuai.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Ambil profil pengguna yang sedang login",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    """Mengembalikan informasi profil pengguna yang terautentikasi saat ini."""
    return UserOut.model_validate(current_user)

