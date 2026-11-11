"""Model SQLAlchemy untuk tabel scholarship_periods (periode seleksi beasiswa)."""

import enum
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, CheckConstraint, Enum, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.applicant import Applicant
    from app.models.aras_calculation_log import ArasCalculationLog
    from app.models.aras_result import ArasResult


class PeriodStatus(str, enum.Enum):
    """Status siklus hidup suatu periode beasiswa."""

    BUKA = "buka"
    PROSES = "proses"
    SELESAI = "selesai"


class ScholarshipPeriod(TimestampMixin, Base):
    """Representasi tabel scholarship_periods untuk periode dan kuota penerima."""

    __tablename__ = "scholarship_periods"
    __table_args__ = (
        CheckConstraint(
            "kuota_penerima > 0",
            name="ck_scholarship_periods_kuota_positive",
        ),
    )

    nama_periode: Mapped[str] = mapped_column(String(150), nullable=False)
    kuota_penerima: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[PeriodStatus] = mapped_column(
        Enum(
            PeriodStatus,
            name="period_status_enum",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=PeriodStatus.BUKA,
        server_default=PeriodStatus.BUKA.value,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("1"),
        index=True,
    )

    applicants: Mapped[List["Applicant"]] = relationship(
        "Applicant",
        back_populates="period",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    aras_results: Mapped[List["ArasResult"]] = relationship(
        "ArasResult",
        back_populates="period",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    calculation_logs: Mapped[List["ArasCalculationLog"]] = relationship(
        "ArasCalculationLog",
        back_populates="period",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

