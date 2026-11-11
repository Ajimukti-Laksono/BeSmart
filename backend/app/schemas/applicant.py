"""Skema Pydantic untuk pendaftaran mahasiswa, nilai kriteria, dan verifikasi panitia."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.applicant import VerificationStatus
from app.models.criterion import CriterionType
from app.models.scholarship_period import PeriodStatus


class ApplicantScoreInput(BaseModel):
    """Satu item input nilai kriteria untuk pendaftar."""

    criterion_id: int = Field(..., gt=0)
    nilai_input: float = Field(..., ge=0.0, description="Nilai tidak boleh negatif")


class ApplicantScoresBatchInput(BaseModel):
    """Payload batch pengisian nilai seluruh kriteria oleh pendaftar."""

    scores: list[ApplicantScoreInput] = Field(..., min_length=1)


class ApplicantScoreOut(BaseModel):
    """Response nilai kriteria pendaftar beserta metadata kriteria terkait."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    applicant_id: int
    criterion_id: int
    kode_kriteria: str
    nama_kriteria: str
    tipe: CriterionType
    nilai_input: float


class ApplicantCreate(BaseModel):
    """Payload pengajuan pendaftaran beasiswa baru."""

    period_id: int = Field(..., gt=0)
    nim: str = Field(..., min_length=3, max_length=30)
    nama_lengkap: str = Field(..., min_length=2, max_length=150)
    program_studi: str = Field(..., min_length=2, max_length=120)
    scores: Optional[list[ApplicantScoreInput]] = None


class ApplicantUpdate(BaseModel):
    """Payload pembaruan biodata pendaftar sebelum diverifikasi."""

    nim: Optional[str] = Field(default=None, min_length=3, max_length=30)
    nama_lengkap: Optional[str] = Field(default=None, min_length=2, max_length=150)
    program_studi: Optional[str] = Field(default=None, min_length=2, max_length=120)


class ApplicantVerifyRequest(BaseModel):
    """Payload pembaruan status verifikasi berkas oleh panitia atau admin."""

    status_verifikasi: VerificationStatus


class ApplicantOut(BaseModel):
    """Response lengkap data pendaftar, status periode, berkas, dan nilai kriteria."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    period_id: int
    user_id: int
    nim: str
    nama_lengkap: str
    program_studi: str
    berkas_path: Optional[str] = None
    has_berkas: bool = False
    status_verifikasi: VerificationStatus
    period_nama: str
    period_status: PeriodStatus
    user_email: str
    scores: list[ApplicantScoreOut] = []
    created_at: datetime
    updated_at: datetime

