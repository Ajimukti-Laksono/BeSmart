"""Skema Pydantic untuk manajemen data pengguna (CRUD oleh Admin)."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    """Payload pembuatan akun baru oleh admin."""

    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = Field(default=UserRole.MAHASISWA)


class UserUpdate(BaseModel):
    """Payload pembaruan akun pengguna oleh admin."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)
    role: Optional[UserRole] = None

