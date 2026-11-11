"""Manajemen engine dan session SQLAlchemy untuk koneksi MySQL 8.0+."""

from typing import Tuple

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def _build_engine_kwargs(database_url: str) -> dict:
    """Menyiapkan opsi engine sesuai dialek database yang digunakan."""
    if database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "connect_args": {"connect_timeout": 2},
    }


engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    **_build_engine_kwargs(settings.DATABASE_URL),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def check_db_connection() -> Tuple[bool, str]:
    """Menguji konektivitas database menggunakan query ringan SELECT 1."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "connected"
    except SQLAlchemyError as exc:
        return False, str(exc.__class__.__name__)

