"""Base class SQLAlchemy dan mixin kolom standar (id, created_at, updated_at)."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base untuk seluruh model SQLAlchemy BeSmart."""


class TimestampMixin:
    """Mixin standar yang menambahkan primary key id serta timestamp created_at dan updated_at."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

