"""Skema Pydantic untuk kalkulasi ARAS, breakdown langkah demi langkah, dan hasil ranking."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.aras_result import EligibilityStatus
from app.models.criterion import CriterionType
from app.models.scholarship_period import PeriodStatus


class ArasCalculateRequest(BaseModel):
    """Opsi opsional saat menjalankan kalkulasi ARAS."""

    publish: bool = Field(
        default=False,
        description="Jika True, status periode langsung diubah ke 'selesai' agar hasil terlihat oleh mahasiswa.",
    )


class ArasCriterionSnapshot(BaseModel):
    """Metadata kriteria yang direkam pada snapshot perhitungan ARAS."""

    id: int
    kode_kriteria: str
    nama_kriteria: str
    tipe: CriterionType
    bobot: float


class ArasApplicantSnapshot(BaseModel):
    """Metadata pendaftar terverifikasi pada snapshot perhitungan ARAS."""

    applicant_id: int
    user_id: int
    nim: str
    nama_lengkap: str
    program_studi: str


class ArasBreakdown(BaseModel):
    """Rincian matriks langkah demi langkah algoritma ARAS."""

    criteria: list[ArasCriterionSnapshot]
    applicants: list[ArasApplicantSnapshot]
    optimal_row_a0: list[float]
    extended_matrix: list[list[float]]
    normalized_matrix_r: list[list[float]]
    weighted_matrix_d: list[list[float]]
    s0: float
    si_values: list[float]
    si_with_a0: list[float]
    ki_values: list[float]
    ki_with_a0: list[float]
    rankings: list[int]
    eligibility_statuses: list[EligibilityStatus]


class ArasResultItem(BaseModel):
    """Satu baris hasil akhir ranking dan status kelulusan penerima beasiswa."""

    applicant_id: int
    user_id: int
    nim: str
    nama_lengkap: str
    program_studi: str
    nilai_si: float
    nilai_ki: float
    ranking: int
    status_lolos: EligibilityStatus
    calculated_at: datetime


class ArasResultsResponse(BaseModel):
    """Response lengkap hasil seleksi ARAS dan breakdown langkah demi langkah."""

    period_id: int
    nama_periode: str
    kuota_penerima: int
    period_status: PeriodStatus
    has_results: bool
    calculated_at: Optional[datetime] = None
    total_candidates: int = 0
    total_lolos: int = 0
    results: list[ArasResultItem] = []
    breakdown: Optional[ArasBreakdown] = None
    my_result: Optional[ArasResultItem] = None

