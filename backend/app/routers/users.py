"""Router manajemen akun pengguna (khusus Admin)."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_roles
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.auth import UserOut
from app.schemas.common import MessageResponse
from app.schemas.user import UserCreate, UserUpdate

router = APIRouter(
    prefix="/users",
    tags=["Manajemen User"],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)


@router.get(
    "",
    response_model=list[UserOut],
    summary="Daftar seluruh pengguna",
)
def list_users(
    role: Optional[UserRole] = Query(default=None, description="Filter berdasarkan peran"),
    search: Optional[str] = Query(default=None, description="Cari nama atau email"),
    db: Session = Depends(get_db),
) -> list[UserOut]:
    """Mengambil daftar akun pengguna dengan opsi filter role dan pencarian."""
    stmt = select(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(or_(User.name.ilike(pattern), User.email.ilike(pattern)))
    stmt = stmt.order_by(User.id.desc())

    users = db.scalars(stmt).all()
    return [UserOut.model_validate(user) for user in users]


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah pengguna baru (Admin)",
)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
) -> UserOut:
    """Membuat akun baru untuk admin, panitia, atau mahasiswa."""
    normalized_email = payload.email.strip().lower()
    existing = db.scalar(select(User).where(User.email == normalized_email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah digunakan oleh akun lain.",
        )

    user = User(
        name=payload.name.strip(),
        email=normalized_email,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get(
    "/{user_id}",
    response_model=UserOut,
    summary="Detail pengguna berdasarkan ID",
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
) -> UserOut:
    """Mengambil detail satu akun pengguna berdasarkan ID."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengguna tidak ditemukan.",
        )
    return UserOut.model_validate(user)


@router.put(
    "/{user_id}",
    response_model=UserOut,
    summary="Perbarui data pengguna",
)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> UserOut:
    """Memperbarui nama, email, peran, atau password pengguna tertentu."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengguna tidak ditemukan.",
        )

    if payload.email is not None:
        normalized_email = payload.email.strip().lower()
        duplicate = db.scalar(
            select(User).where(User.email == normalized_email, User.id != user_id)
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email sudah digunakan oleh akun lain.",
            )
        user.email = normalized_email

    if payload.name is not None:
        user.name = payload.name.strip()

    if payload.role is not None:
        if user.id == current_admin.id and payload.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin tidak dapat menurunkan peran akunnya sendiri.",
            )
        user.role = payload.role

    if payload.password is not None:
        user.password_hash = get_password_hash(payload.password)

    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    summary="Hapus akun pengguna",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> MessageResponse:
    """Menghapus akun pengguna dari sistem (tidak mengizinkan menghapus akun sendiri)."""
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anda tidak dapat menghapus akun yang sedang digunakan.",
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengguna tidak ditemukan.",
        )

    db.delete(user)
    db.commit()
    return MessageResponse(message="Akun pengguna berhasil dihapus.")

