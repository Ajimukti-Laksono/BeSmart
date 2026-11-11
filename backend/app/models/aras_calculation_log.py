"""Model SQLAlchemy untuk tabel aras_calculation_logs (snapshot matriks langkah demi langkah)."""

from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.scholarship_period import ScholarshipPeriod


class ArasCalculationLog(TimestampMixin, Base):
    """Menyimpan snapshot JSON lengkap matriks A0, R, D, Si, S0, Ki, dan ranking per kalkulasi."""

    __tablename__ = "aras_calculation_logs"

    period_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("scholarship_periods.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    period: Mapped["ScholarshipPeriod"] = relationship(
        "ScholarshipPeriod",
        back_populates="calculation_logs",
    )

