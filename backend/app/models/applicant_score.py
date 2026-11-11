"""Model SQLAlchemy untuk tabel applicant_scores (nilai pendaftar per kriteria)."""

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.applicant import Applicant
    from app.models.criterion import Criterion


class ApplicantScore(TimestampMixin, Base):
    """Representasi tabel applicant_scores untuk matriks keputusan X_ij."""

    __tablename__ = "applicant_scores"
    __table_args__ = (
        UniqueConstraint(
            "applicant_id",
            "criterion_id",
            name="uq_applicant_scores_applicant_criterion",
        ),
    )

    applicant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("applicants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    criterion_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("criteria.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nilai_input: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)

    applicant: Mapped["Applicant"] = relationship(
        "Applicant",
        back_populates="scores",
    )
    criterion: Mapped["Criterion"] = relationship(
        "Criterion",
        back_populates="applicant_scores",
    )

