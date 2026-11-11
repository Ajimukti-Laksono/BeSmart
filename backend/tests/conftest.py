"""Konfigurasi fixture pytest bersama untuk pengujian REST API terisolasi."""

from typing import Generator

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.dependencies import get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models import Base, User, UserRole


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Menyediakan sesi SQLite in-memory yang di-reset untuk setiap skenario test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Menyediakan TestClient FastAPI dengan override dependency database uji."""

    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db_session
        except Exception:
            db_session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def seed_users(db_session: Session) -> dict[str, User]:
    """Membuat akun uji untuk masing-masing peran (admin, panitia, mahasiswa)."""
    admin = User(
        name="Admin BeSmart",
        email="admin@besmart.ac.id",
        password_hash=get_password_hash("Admin123!"),
        role=UserRole.ADMIN,
    )
    panitia = User(
        name="Panitia Verifikator",
        email="panitia@besmart.ac.id",
        password_hash=get_password_hash("Panitia123!"),
        role=UserRole.PANITIA,
    )
    mahasiswa = User(
        name="Mahasiswa Uji",
        email="mahasiswa@besmart.ac.id",
        password_hash=get_password_hash("Mahasiswa123!"),
        role=UserRole.MAHASISWA,
    )
    db_session.add_all([admin, panitia, mahasiswa])
    db_session.commit()
    for user in (admin, panitia, mahasiswa):
        db_session.refresh(user)
    return {"admin": admin, "panitia": panitia, "mahasiswa": mahasiswa}


def auth_header(user: User) -> dict[str, str]:
    """Helper membuat header Authorization Bearer JWT untuk user tertentu."""
    token = create_access_token(subject=user.id, role=user.role.value)
    return {"Authorization": f"Bearer {token}"}

