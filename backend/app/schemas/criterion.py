"""Skema Pydantic untuk manajemen kriteria dan bobot penilaian ARAS."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.criterion import CriterionType


class CriterionCreate(BaseModel):
    """Payload penambahan kriteria penilaian ARAS."""

    kode_kriteria: str = Field(..., min_length=1, max_length=20)
    nama_kriteria: str = Field(..., min_length=2, max_length=150)
    tipe: CriterionType
    bobot: float = Field(..., ge=0.0, le=1.0, description="Bobot kriteria antara 0 dan 1")
    keterangan: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("kode_kriteria")
    @classmethod
    def normalize_kode(cls, value: str) -> str:
        """Menormalisasi kode kriteria menjadi huruf kapital tanpa spasi berlebih."""
        cleaned = value.strip().upper()
        if not cleaned:
            raise ValueError("Kode kriteria tidak boleh kosong.")
        return cleaned


class CriterionUpdate(BaseModel):
    """Payload pembaruan kriteria penilaian ARAS."""

    kode_kriteria: Optional[str] = Field(default=None, min_length=1, max_length=20)
    nama_kriteria: Optional[str] = Field(default=None, min_length=2, max_length=150)
    tipe: Optional[CriterionType] = None
    bobot: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    keterangan: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("kode_kriteria")
    @classmethod
    def normalize_kode(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip().upper()
        if not cleaned:
            raise ValueError("Kode kriteria tidak boleh kosong.")
        return cleaned


class CriterionOut(BaseModel):
    """Response satu data kriteria."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kode_kriteria: str
    nama_kriteria: str
    tipe: CriterionType
    bobot: float
    keterangan: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CriteriaListResponse(BaseModel):
    """Response daftar kriteria lengkap dengan indikator validasi total bobot."""

    items: list[CriterionOut]
    total_bobot: float
    is_valid_weight: bool
    weight_difference: float

