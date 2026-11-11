"""Model SQLAlchemy untuk tabel criteria (kriteria dan bobot penilaian ARAS)."""

import enum
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, Enum, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.applicant_score import ApplicantScore


class CriterionType(str, enum.Enum):
    """Tipe kriteria ARAS: benefit (makin besar makin baik) atau cost (makin kecil makin baik)."""

    BENEFIT = "benefit"
    COST = "cost"


class Criterion(TimestampMixin, Base):
    """Representasi tabel criteria untuk kode, tipe, dan bobot kriteria SPK."""

    __tablename__ = "criteria"
    __table_args__ = (
        CheckConstraint(
            "bobot >= 0 AND bobot <= 1",
            name="ck_criteria_bobot_range",
        ),
    )

    kode_kriteria: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
    )
    nama_kriteria: Mapped[str] = mapped_column(String(150), nullable=False)
    tipe: Mapped[CriterionType] = mapped_column(
        Enum(
            CriterionType,
            name="criterion_type_enum",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )
    bobot: Mapped[Decimal] = mapped_column(Numeric(6, 4), nullable=False)
    keterangan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    applicant_scores: Mapped[List["ApplicantScore"]] = relationship(
        "ApplicantScore",
        back_populates="criterion",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

