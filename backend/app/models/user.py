"""Model SQLAlchemy untuk tabel users (pengguna sistem dan RBAC)."""

import enum
from typing import TYPE_CHECKING, List

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.applicant import Applicant


class UserRole(str, enum.Enum):
    """Peran pengguna yang didukung untuk kontrol akses (RBAC)."""

    ADMIN = "admin"
    PANITIA = "panitia"
    MAHASISWA = "mahasiswa"


class User(TimestampMixin, Base):
    """Representasi tabel users untuk akun admin, panitia, dan mahasiswa."""

    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role_enum",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=UserRole.MAHASISWA,
        server_default=UserRole.MAHASISWA.value,
        index=True,
    )

    applicants: Mapped[List["Applicant"]] = relationship(
        "Applicant",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

