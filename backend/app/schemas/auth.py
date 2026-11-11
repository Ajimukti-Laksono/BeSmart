"""Skema Pydantic untuk autentikasi (registrasi, login, dan token JWT)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserOut(BaseModel):
    """Representasi publik data pengguna tanpa password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime
    updated_at: datetime


class RegisterRequest(BaseModel):
    """Payload registrasi mandiri akun mahasiswa."""

    name: str = Field(..., min_length=2, max_length=120, description="Nama lengkap mahasiswa")
    email: EmailStr = Field(..., description="Alamat email aktif mahasiswa")
    password: str = Field(..., min_length=6, max_length=128, description="Minimal 6 karakter")


class LoginRequest(BaseModel):
    """Payload login pengguna menggunakan email dan password."""

    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    """Response login/register berisi token JWT dan profil pengguna."""

    access_token: str
    token_type: str = "bearer"
    user: UserOut

