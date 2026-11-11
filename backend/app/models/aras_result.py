"""Model SQLAlchemy untuk tabel aras_results (hasil ranking dan status kelulusan ARAS)."""

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.applicant import Applicant
    from app.models.scholarship_period import ScholarshipPeriod


class EligibilityStatus(str, enum.Enum):
    """Status kelulusan penerima beasiswa berdasarkan perbandingan ranking dan kuota."""

    LOLOS = "lolos"
    TIDAK_LOLOS = "tidak_lolos"


class ArasResult(TimestampMixin, Base):
    """Representasi tabel aras_results yang menyimpan Si, Ki, ranking, dan kelulusan."""

    __tablename__ = "aras_results"
    __table_args__ = (
        UniqueConstraint(
            "period_id",
            "applicant_id",
            name="uq_aras_results_period_applicant",
        ),
        Index("ix_aras_results_period_ranking", "period_id", "ranking"),
    )

    period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scholarship_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    applicant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("applicants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nilai_si: Mapped[Decimal] = mapped_column(Numeric(12, 8), nullable=False)
    nilai_ki: Mapped[Decimal] = mapped_column(Numeric(12, 8), nullable=False)
    ranking: Mapped[int] = mapped_column(Integer, nullable=False)
    status_lolos: Mapped[EligibilityStatus] = mapped_column(
        Enum(
            EligibilityStatus,
            name="eligibility_status_enum",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        index=True,
    )
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    period: Mapped["ScholarshipPeriod"] = relationship(
        "ScholarshipPeriod",
        back_populates="aras_results",
    )
    applicant: Mapped["Applicant"] = relationship(
        "Applicant",
        back_populates="aras_result",
    )

