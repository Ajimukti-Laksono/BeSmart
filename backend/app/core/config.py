"""Konfigurasi aplikasi BeSmart menggunakan Pydantic Settings dan file .env."""

from functools import lru_cache
import json
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Konfigurasi terpusat aplikasi backend yang dibaca dari environment/.env."""

    APP_NAME: str = "BeasiswaSmart (BeSmart)"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/besmart_db?charset=utf8mb4"

    JWT_SECRET_KEY: str = "ganti-dengan-secret-key-yang-aman-minimal-32-karakter"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Mengurai daftar origin CORS baik dari format JSON array maupun string dipisah koma."""
        raw = self.CORS_ORIGINS.strip()
        if not raw:
            return []
        if raw.startswith("["):
            parsed = json.loads(raw)
            return [str(origin).strip() for origin in parsed if str(origin).strip()]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @property
    def upload_path(self) -> Path:
        """Mengembalikan path absolut direktori penyimpanan berkas upload."""
        candidate = Path(self.UPLOAD_DIR)
        if candidate.is_absolute():
            return candidate
        return BACKEND_DIR / candidate


@lru_cache
def get_settings() -> Settings:
    """Mengambil instance konfigurasi singleton yang di-cache."""
    return Settings()


settings = get_settings()

