"""Router manajemen kriteria penilaian dan bobot ARAS."""

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_roles
from app.models.criterion import Criterion
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse
from app.schemas.criterion import (
    CriteriaListResponse,
    CriterionCreate,
    CriterionOut,
    CriterionUpdate,
)

router = APIRouter(prefix="/criteria", tags=["Kriteria & Bobot"])

WEIGHT_TOLERANCE = 1e-6


def _criterion_sort_key(criterion: Criterion) -> tuple[int, str]:
    """Urutan natural untuk kode kriteria (misal C1, C2, ..., C10)."""
    match = re.search(r"(\d+)", criterion.kode_kriteria)
    num = int(match.group(1)) if match else 999999
    return (num, criterion.kode_kriteria)


@router.get(
    "",
    response_model=CriteriaListResponse,
    summary="Daftar kriteria dan indikator total bobot",
)
def list_criteria(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> CriteriaListResponse:
    """Mengambil seluruh kriteria penilaian beserta total bobot dan status validasinya."""
    criteria_rows = list(db.scalars(select(Criterion)).all())
    criteria_rows.sort(key=_criterion_sort_key)

    total_bobot = round(sum(float(item.bobot) for item in criteria_rows), 6)
    diff = round(1.0 - total_bobot, 6)
    is_valid = len(criteria_rows) > 0 and abs(total_bobot - 1.0) <= WEIGHT_TOLERANCE

    return CriteriaListResponse(
        items=[CriterionOut.model_validate(item) for item in criteria_rows],
        total_bobot=total_bobot,
        is_valid_weight=is_valid,
        weight_difference=diff,
    )


@router.post(
    "",
    response_model=CriterionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Tambah kriteria penilaian (Admin)",
)
def create_criterion(
    payload: CriterionCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> CriterionOut:
    """Menambahkan kriteria baru untuk perhitungan ARAS."""
    existing = db.scalar(
        select(Criterion).where(Criterion.kode_kriteria == payload.kode_kriteria)
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Kode kriteria '{payload.kode_kriteria}' sudah digunakan.",
        )

    criterion = Criterion(
        kode_kriteria=payload.kode_kriteria,
        nama_kriteria=payload.nama_kriteria.strip(),
        tipe=payload.tipe,
        bobot=payload.bobot,
        keterangan=payload.keterangan.strip() if payload.keterangan else None,
    )
    db.add(criterion)
    db.commit()
    db.refresh(criterion)
    return CriterionOut.model_validate(criterion)


@router.put(
    "/{criterion_id}",
    response_model=CriterionOut,
    summary="Perbarui kriteria penilaian (Admin)",
)
def update_criterion(
    criterion_id: int,
    payload: CriterionUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> CriterionOut:
    """Memperbarui kode, nama, tipe benefit/cost, bobot, atau keterangan kriteria."""
    criterion = db.get(Criterion, criterion_id)
    if criterion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kriteria tidak ditemukan.",
        )

    if payload.kode_kriteria is not None:
        duplicate = db.scalar(
            select(Criterion).where(
                Criterion.kode_kriteria == payload.kode_kriteria,
                Criterion.id != criterion_id,
            )
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Kode kriteria '{payload.kode_kriteria}' sudah digunakan.",
            )
        criterion.kode_kriteria = payload.kode_kriteria

    if payload.nama_kriteria is not None:
        criterion.nama_kriteria = payload.nama_kriteria.strip()
    if payload.tipe is not None:
        criterion.tipe = payload.tipe
    if payload.bobot is not None:
        criterion.bobot = payload.bobot
    if payload.keterangan is not None:
        criterion.keterangan = payload.keterangan.strip() or None

    db.commit()
    db.refresh(criterion)
    return CriterionOut.model_validate(criterion)


@router.delete(
    "/{criterion_id}",
    response_model=MessageResponse,
    summary="Hapus kriteria penilaian (Admin)",
)
def delete_criterion(
    criterion_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> MessageResponse:
    """Menghapus kriteria penilaian beserta nilai pendaftar terkaitnya."""
    criterion = db.get(Criterion, criterion_id)
    if criterion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kriteria tidak ditemukan.",
        )

    db.delete(criterion)
    db.commit()
    return MessageResponse(message="Kriteria berhasil dihapus.")

