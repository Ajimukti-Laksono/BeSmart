"""Skema Pydantic untuk manajemen periode beasiswa (scholarship_periods)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.scholarship_period import PeriodStatus


class PeriodCreate(BaseModel):
    """Payload pembuatan periode beasiswa baru oleh admin."""

    nama_periode: str = Field(..., min_length=3, max_length=150)
    kuota_penerima: int = Field(..., gt=0, description="Kuota penerima harus > 0")
    status: PeriodStatus = Field(default=PeriodStatus.BUKA)
    is_active: bool = Field(default=True)


class PeriodUpdate(BaseModel):
    """Payload pembaruan data periode beasiswa oleh admin."""

    nama_periode: Optional[str] = Field(default=None, min_length=3, max_length=150)
    kuota_penerima: Optional[int] = Field(default=None, gt=0)
    status: Optional[PeriodStatus] = None
    is_active: Optional[bool] = None


class PeriodStatusUpdate(BaseModel):
    """Payload perubahan status siklus periode beasiswa."""

    status: PeriodStatus
    is_active: Optional[bool] = None


class PeriodOut(BaseModel):
    """Response detail periode beasiswa beserta statistik ringkas pendaftar."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nama_periode: str
    kuota_penerima: int
    status: PeriodStatus
    is_active: bool
    total_applicants: int = 0
    verified_applicants: int = 0
    pending_applicants: int = 0
    rejected_applicants: int = 0
    created_at: datetime
    updated_at: datetime

