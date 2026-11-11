"""Ekspor terpusat seluruh model SQLAlchemy agar terdeteksi oleh Alembic."""

from app.db.base import Base
from app.models.applicant import Applicant, VerificationStatus
from app.models.applicant_score import ApplicantScore
from app.models.aras_calculation_log import ArasCalculationLog
from app.models.aras_result import ArasResult, EligibilityStatus
from app.models.criterion import Criterion, CriterionType
from app.models.scholarship_period import PeriodStatus, ScholarshipPeriod
from app.models.user import User, UserRole

__all__ = [
    "Base",
    "User",
    "UserRole",
    "ScholarshipPeriod",
    "PeriodStatus",
    "Criterion",
    "CriterionType",
    "Applicant",
    "VerificationStatus",
    "ApplicantScore",
    "ArasResult",
    "EligibilityStatus",
    "ArasCalculationLog",
]

