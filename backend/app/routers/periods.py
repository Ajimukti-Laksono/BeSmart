"""Router manajemen periode beasiswa (CRUD, statistik pendaftar, dan status periode)."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_roles
from app.models.applicant import Applicant, VerificationStatus
from app.models.scholarship_period import PeriodStatus, ScholarshipPeriod
from app.models.user import User, UserRole
from app.schemas.common import MessageResponse
from app.schemas.period import PeriodCreate, PeriodOut, PeriodStatusUpdate, PeriodUpdate

router = APIRouter(prefix="/periods", tags=["Periode Beasiswa"])


def _build_period_out(db: Session, period: ScholarshipPeriod) -> PeriodOut:
    """Menyusun output periode lengkap dengan ringkasan jumlah pendaftar per status."""
    stats = db.execute(
        select(
            func.count(Applicant.id),
            func.sum(
                case(
                    (Applicant.status_verifikasi == VerificationStatus.VERIFIED, 1),
                    else_=0,
                )
            ),
            func.sum(
                case(
                    (Applicant.status_verifikasi == VerificationStatus.PENDING, 1),
                    else_=0,
                )
            ),
            func.sum(
                case(
                    (Applicant.status_verifikasi == VerificationStatus.REJECTED, 1),
                    else_=0,
                )
            ),
        ).where(Applicant.period_id == period.id)
    ).one()

    return PeriodOut(
        id=period.id,
        nama_periode=period.nama_periode,
        kuota_penerima=period.kuota_penerima,
        status=period.status,
        is_active=period.is_active,
        total_applicants=int(stats[0] or 0),
        verified_applicants=int(stats[1] or 0),
        pending_applicants=int(stats[2] or 0),
        rejected_applicants=int(stats[3] or 0),
        created_at=period.created_at,
        updated_at=period.updated_at,
    )


@router.get(
    "",
    response_model=list[PeriodOut],
    summary="Daftar periode beasiswa",
)
def list_periods(
    is_active: Optional[bool] = Query(default=None),
    status_filter: Optional[PeriodStatus] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> list[PeriodOut]:
    """Mengambil seluruh periode beasiswa beserta ringkasan statistik pendaftar."""
    stmt = select(ScholarshipPeriod)
    if is_active is not None:
        stmt = stmt.where(ScholarshipPeriod.is_active == is_active)
    if status_filter is not None:
        stmt = stmt.where(ScholarshipPeriod.status == status_filter)
    stmt = stmt.order_by(ScholarshipPeriod.id.desc())

    periods = db.scalars(stmt).all()
    return [_build_period_out(db, period) for period in periods]


@router.post(
    "",
    response_model=PeriodOut,
    status_code=status.HTTP_201_CREATED,
    summary="Buat periode beasiswa baru (Admin)",
)
def create_period(
    payload: PeriodCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> PeriodOut:
    """Membuat periode seleksi beasiswa baru dengan kuota penerima > 0."""
    period = ScholarshipPeriod(
        nama_periode=payload.nama_periode.strip(),
        kuota_penerima=payload.kuota_penerima,
        status=payload.status,
        is_active=payload.is_active,
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    return _build_period_out(db, period)


@router.get(
    "/{period_id}",
    response_model=PeriodOut,
    summary="Detail periode beasiswa",
)
def get_period(
    period_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> PeriodOut:
    """Mengambil detail satu periode beasiswa berdasarkan ID."""
    period = db.get(ScholarshipPeriod, period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periode beasiswa tidak ditemukan.",
        )
    return _build_period_out(db, period)


@router.put(
    "/{period_id}",
    response_model=PeriodOut,
    summary="Perbarui periode beasiswa (Admin)",
)
def update_period(
    period_id: int,
    payload: PeriodUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> PeriodOut:
    """Memperbarui nama, kuota penerima, status, atau flag aktif periode beasiswa."""
    period = db.get(ScholarshipPeriod, period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periode beasiswa tidak ditemukan.",
        )

    if payload.nama_periode is not None:
        period.nama_periode = payload.nama_periode.strip()
    if payload.kuota_penerima is not None:
        period.kuota_penerima = payload.kuota_penerima
    if payload.status is not None:
        period.status = payload.status
    if payload.is_active is not None:
        period.is_active = payload.is_active

    db.commit()
    db.refresh(period)
    return _build_period_out(db, period)


@router.patch(
    "/{period_id}/status",
    response_model=PeriodOut,
    summary="Ubah status periode beasiswa (Admin)",
)
def update_period_status(
    period_id: int,
    payload: PeriodStatusUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> PeriodOut:
    """Mengubah status siklus periode antara 'buka', 'proses', dan 'selesai'."""
    period = db.get(ScholarshipPeriod, period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periode beasiswa tidak ditemukan.",
        )

    period.status = payload.status
    if payload.is_active is not None:
        period.is_active = payload.is_active

    db.commit()
    db.refresh(period)
    return _build_period_out(db, period)


@router.delete(
    "/{period_id}",
    response_model=MessageResponse,
    summary="Hapus periode beasiswa (Admin)",
)
def delete_period(
    period_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> MessageResponse:
    """Menghapus periode beasiswa beserta data terkaitnya secara cascade."""
    period = db.get(ScholarshipPeriod, period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periode beasiswa tidak ditemukan.",
        )

    db.delete(period)
    db.commit()
    return MessageResponse(message="Periode beasiswa berhasil dihapus.")

