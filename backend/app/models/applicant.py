"""Model SQLAlchemy untuk tabel applicants (data pendaftar beasiswa per periode)."""

import enum
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.applicant_score import ApplicantScore
    from app.models.aras_result import ArasResult
    from app.models.scholarship_period import ScholarshipPeriod
    from app.models.user import User


class VerificationStatus(str, enum.Enum):
    """Status verifikasi berkas dan kelayakan data pendaftar oleh panitia."""

    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Applicant(TimestampMixin, Base):
    """Representasi tabel applicants sebagai alternatif penilaian ARAS."""

    __tablename__ = "applicants"
    __table_args__ = (
        UniqueConstraint("period_id", "user_id", name="uq_applicants_period_user"),
        Index("ix_applicants_period_status", "period_id", "status_verifikasi"),
    )

    period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scholarship_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nim: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    nama_lengkap: Mapped[str] = mapped_column(String(150), nullable=False)
    program_studi: Mapped[str] = mapped_column(String(120), nullable=False)
    berkas_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status_verifikasi: Mapped[VerificationStatus] = mapped_column(
        Enum(
            VerificationStatus,
            name="verification_status_enum",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=VerificationStatus.PENDING,
        server_default=VerificationStatus.PENDING.value,
        index=True,
    )

    period: Mapped["ScholarshipPeriod"] = relationship(
        "ScholarshipPeriod",
        back_populates="applicants",
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="applicants",
    )
    scores: Mapped[List["ApplicantScore"]] = relationship(
        "ApplicantScore",
        back_populates="applicant",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    aras_result: Mapped[Optional["ArasResult"]] = relationship(
        "ArasResult",
        back_populates="applicant",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

