"""Router pendaftaran mahasiswa, input nilai kriteria, unggah berkas, dan verifikasi panitia."""

import mimetypes
from pathlib import Path
import re
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db, require_roles
from app.models.applicant import Applicant, VerificationStatus
from app.models.applicant_score import ApplicantScore
from app.models.criterion import Criterion, CriterionType
from app.models.scholarship_period import PeriodStatus, ScholarshipPeriod
from app.models.user import User, UserRole
from app.schemas.applicant import (
    ApplicantCreate,
    ApplicantOut,
    ApplicantScoreInput,
    ApplicantScoreOut,
    ApplicantScoresBatchInput,
    ApplicantUpdate,
    ApplicantVerifyRequest,
)

router = APIRouter(prefix="/applicants", tags=["Pendaftar & Verifikasi"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def _criterion_code_sort_key(score: ApplicantScore) -> tuple[int, str]:
    kode = score.criterion.kode_kriteria if score.criterion else ""
    match = re.search(r"(\d+)", kode)
    return (int(match.group(1)) if match else 999999, kode)


def _load_applicant_or_404(db: Session, applicant_id: int) -> Applicant:
    """Mengambil data pendaftar lengkap beserta relasi periode, user, dan nilai kriteria."""
    stmt = (
        select(Applicant)
        .options(
            selectinload(Applicant.period),
            selectinload(Applicant.user),
            selectinload(Applicant.scores).selectinload(ApplicantScore.criterion),
        )
        .where(Applicant.id == applicant_id)
    )
    applicant = db.scalar(stmt)
    if applicant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data pendaftar tidak ditemukan.",
        )
    return applicant


def _serialize_applicant(applicant: Applicant) -> ApplicantOut:
    """Mengonversi entity Applicant menjadi response ApplicantOut yang rapi."""
    sorted_scores = sorted(applicant.scores, key=_criterion_code_sort_key)
    score_items = [
        ApplicantScoreOut(
            id=score.id,
            applicant_id=score.applicant_id,
            criterion_id=score.criterion_id,
            kode_kriteria=score.criterion.kode_kriteria,
            nama_kriteria=score.criterion.nama_kriteria,
            tipe=score.criterion.tipe,
            nilai_input=float(score.nilai_input),
        )
        for score in sorted_scores
        if score.criterion is not None
    ]

    return ApplicantOut(
        id=applicant.id,
        period_id=applicant.period_id,
        user_id=applicant.user_id,
        nim=applicant.nim,
        nama_lengkap=applicant.nama_lengkap,
        program_studi=applicant.program_studi,
        berkas_path=applicant.berkas_path,
        has_berkas=bool(applicant.berkas_path),
        status_verifikasi=applicant.status_verifikasi,
        period_nama=applicant.period.nama_periode,
        period_status=applicant.period.status,
        user_email=applicant.user.email,
        scores=score_items,
        created_at=applicant.created_at,
        updated_at=applicant.updated_at,
    )


def _ensure_applicant_access(applicant: Applicant, current_user: User) -> None:
    """Memastikan mahasiswa hanya dapat mengakses data miliknya sendiri."""
    if (
        current_user.role == UserRole.MAHASISWA
        and applicant.user_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak diizinkan mengakses data pendaftar lain.",
        )


def _ensure_editable_by_user(applicant: Applicant, current_user: User) -> None:
    """Memastikan pendaftar boleh diubah oleh mahasiswa pemilik atau admin."""
    _ensure_applicant_access(applicant, current_user)
    if current_user.role == UserRole.PANITIA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Panitia hanya dapat melakukan verifikasi, bukan mengubah data pendaftar.",
        )
    if current_user.role == UserRole.MAHASISWA:
        if applicant.period.status != PeriodStatus.BUKA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pendaftaran sudah ditutup sehingga data tidak dapat diubah.",
            )
        if applicant.status_verifikasi == VerificationStatus.VERIFIED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data yang sudah diverifikasi tidak dapat diubah.",
            )


def _upsert_applicant_scores(
    db: Session,
    applicant: Applicant,
    scores: list[ApplicantScoreInput],
) -> None:
    """Memvalidasi dan menyimpan (upsert) nilai kriteria untuk seorang pendaftar."""
    criterion_ids = [item.criterion_id for item in scores]
    if len(set(criterion_ids)) != len(criterion_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terdapat duplikasi criterion_id pada daftar nilai.",
        )

    criteria_list = db.scalars(
        select(Criterion).where(Criterion.id.in_(criterion_ids))
    ).all()
    criteria_map = {item.id: item for item in criteria_list}

    missing_ids = [cid for cid in criterion_ids if cid not in criteria_map]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kriteria dengan ID {missing_ids} tidak ditemukan.",
        )

    for item in scores:
        criterion = criteria_map[item.criterion_id]
        if criterion.tipe == CriterionType.COST and item.nilai_input <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"Nilai untuk kriteria cost '{criterion.kode_kriteria} - {criterion.nama_kriteria}' "
                    "harus lebih besar dari 0."
                ),
            )

    existing_scores = {
        score.criterion_id: score
        for score in db.scalars(
            select(ApplicantScore).where(ApplicantScore.applicant_id == applicant.id)
        ).all()
    }

    for item in scores:
        if item.criterion_id in existing_scores:
            existing_scores[item.criterion_id].nilai_input = item.nilai_input
        else:
            db.add(
                ApplicantScore(
                    applicant_id=applicant.id,
                    criterion_id=item.criterion_id,
                    nilai_input=item.nilai_input,
                )
            )


@router.get(
    "",
    response_model=list[ApplicantOut],
    summary="Daftar pendaftar beasiswa",
)
def list_applicants(
    period_id: Optional[int] = Query(default=None),
    status_verifikasi: Optional[VerificationStatus] = Query(default=None),
    search: Optional[str] = Query(default=None, description="Cari NIM, nama, atau prodi"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ApplicantOut]:
    """Mengambil daftar pendaftar. Mahasiswa hanya melihat pendaftarannya sendiri."""
    stmt = select(Applicant).options(
        selectinload(Applicant.period),
        selectinload(Applicant.user),
        selectinload(Applicant.scores).selectinload(ApplicantScore.criterion),
    )

    if current_user.role == UserRole.MAHASISWA:
        stmt = stmt.where(Applicant.user_id == current_user.id)
    if period_id is not None:
        stmt = stmt.where(Applicant.period_id == period_id)
    if status_verifikasi is not None:
        stmt = stmt.where(Applicant.status_verifikasi == status_verifikasi)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Applicant.nim.ilike(pattern),
                Applicant.nama_lengkap.ilike(pattern),
                Applicant.program_studi.ilike(pattern),
            )
        )

    stmt = stmt.order_by(Applicant.id.desc())
    applicants = db.scalars(stmt).all()
    return [_serialize_applicant(item) for item in applicants]


@router.post(
    "",
    response_model=ApplicantOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ajukan pendaftaran beasiswa",
)
def create_applicant(
    payload: ApplicantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MAHASISWA, UserRole.ADMIN)),
) -> ApplicantOut:
    """Mendaftarkan mahasiswa ke periode beasiswa aktif yang masih dibuka."""
    period = db.get(ScholarshipPeriod, payload.period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Periode beasiswa tidak ditemukan.",
        )

    if not period.is_active or period.status != PeriodStatus.BUKA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Periode beasiswa ini sedang tidak membuka pendaftaran.",
        )

    duplicate = db.scalar(
        select(Applicant).where(
            Applicant.period_id == payload.period_id,
            Applicant.user_id == current_user.id,
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Anda sudah terdaftar pada periode beasiswa ini.",
        )

    applicant = Applicant(
        period_id=payload.period_id,
        user_id=current_user.id,
        nim=payload.nim.strip(),
        nama_lengkap=payload.nama_lengkap.strip(),
        program_studi=payload.program_studi.strip(),
        status_verifikasi=VerificationStatus.PENDING,
    )
    db.add(applicant)
    db.flush()

    if payload.scores:
        _upsert_applicant_scores(db, applicant, payload.scores)

    db.commit()
    reloaded = _load_applicant_or_404(db, applicant.id)
    return _serialize_applicant(reloaded)


@router.get(
    "/{applicant_id}",
    response_model=ApplicantOut,
    summary="Detail pendaftar beasiswa",
)
def get_applicant(
    applicant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplicantOut:
    """Mengambil detail pendaftaran beserta nilai kriteria."""
    applicant = _load_applicant_or_404(db, applicant_id)
    _ensure_applicant_access(applicant, current_user)
    return _serialize_applicant(applicant)


@router.put(
    "/{applicant_id}",
    response_model=ApplicantOut,
    summary="Perbarui biodata pendaftar",
)
def update_applicant(
    applicant_id: int,
    payload: ApplicantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MAHASISWA, UserRole.ADMIN)),
) -> ApplicantOut:
    """Memperbarui NIM, nama lengkap, atau program studi pendaftar."""
    applicant = _load_applicant_or_404(db, applicant_id)
    _ensure_editable_by_user(applicant, current_user)

    if payload.nim is not None:
        applicant.nim = payload.nim.strip()
    if payload.nama_lengkap is not None:
        applicant.nama_lengkap = payload.nama_lengkap.strip()
    if payload.program_studi is not None:
        applicant.program_studi = payload.program_studi.strip()

    if (
        current_user.role == UserRole.MAHASISWA
        and applicant.status_verifikasi == VerificationStatus.REJECTED
    ):
        applicant.status_verifikasi = VerificationStatus.PENDING

    db.commit()
    reloaded = _load_applicant_or_404(db, applicant.id)
    return _serialize_applicant(reloaded)


@router.patch(
    "/{applicant_id}/verify",
    response_model=ApplicantOut,
    summary="Verifikasi atau tolak berkas pendaftar (Panitia / Admin)",
)
def verify_applicant(
    applicant_id: int,
    payload: ApplicantVerifyRequest,
    db: Session = Depends(get_db),
    _verifier: User = Depends(require_roles(UserRole.PANITIA, UserRole.ADMIN)),
) -> ApplicantOut:
    """Mengubah status_verifikasi pendaftar menjadi pending, verified, atau rejected."""
    applicant = _load_applicant_or_404(db, applicant_id)
    if applicant.period.status == PeriodStatus.SELESAI:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status verifikasi tidak dapat diubah karena periode telah selesai.",
        )

    applicant.status_verifikasi = payload.status_verifikasi
    db.commit()
    reloaded = _load_applicant_or_404(db, applicant.id)
    return _serialize_applicant(reloaded)


@router.post(
    "/{applicant_id}/scores",
    response_model=ApplicantOut,
    summary="Simpan nilai kriteria pendaftar",
)
@router.put(
    "/{applicant_id}/scores",
    response_model=ApplicantOut,
    summary="Perbarui nilai kriteria pendaftar",
)
def save_applicant_scores(
    applicant_id: int,
    payload: ApplicantScoresBatchInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MAHASISWA, UserRole.ADMIN)),
) -> ApplicantOut:
    """Menyimpan atau memperbarui nilai kriteria pendaftar (upsert per kriteria)."""
    applicant = _load_applicant_or_404(db, applicant_id)
    _ensure_editable_by_user(applicant, current_user)

    _upsert_applicant_scores(db, applicant, payload.scores)

    if (
        current_user.role == UserRole.MAHASISWA
        and applicant.status_verifikasi == VerificationStatus.REJECTED
    ):
        applicant.status_verifikasi = VerificationStatus.PENDING

    db.commit()
    reloaded = _load_applicant_or_404(db, applicant.id)
    return _serialize_applicant(reloaded)


@router.post(
    "/{applicant_id}/berkas",
    response_model=ApplicantOut,
    summary="Unggah berkas persyaratan pendaftar",
)
async def upload_applicant_berkas(
    applicant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MAHASISWA, UserRole.ADMIN)),
) -> ApplicantOut:
    """Mengunggah berkas persyaratan (PDF/JPG/PNG, maks sesuai konfigurasi)."""
    applicant = _load_applicant_or_404(db, applicant_id)
    _ensure_editable_by_user(applicant, current_user)

    original_name = file.filename or ""
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format berkas harus berupa PDF, JPG, JPEG, atau PNG.",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File yang diunggah kosong.",
        )
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Ukuran berkas melebihi batas maksimal {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    upload_dir = settings.upload_path.resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    if applicant.berkas_path:
        old_path = (upload_dir / applicant.berkas_path).resolve()
        if old_path.is_relative_to(upload_dir) and old_path.is_file():
            old_path.unlink(missing_ok=True)

    safe_filename = f"applicant_{applicant.id}_{uuid4().hex}{ext}"
    target_path = (upload_dir / safe_filename).resolve()
    target_path.write_bytes(content)

    applicant.berkas_path = safe_filename
    if (
        current_user.role == UserRole.MAHASISWA
        and applicant.status_verifikasi == VerificationStatus.REJECTED
    ):
        applicant.status_verifikasi = VerificationStatus.PENDING

    db.commit()
    reloaded = _load_applicant_or_404(db, applicant.id)
    return _serialize_applicant(reloaded)


@router.get(
    "/{applicant_id}/berkas",
    summary="Preview atau unduh berkas pendaftar terautentikasi",
)
def download_applicant_berkas(
    applicant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """Mengambil berkas persyaratan pendaftar dengan pengecekan otorisasi peran."""
    applicant = _load_applicant_or_404(db, applicant_id)
    _ensure_applicant_access(applicant, current_user)

    if not applicant.berkas_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pendaftar belum mengunggah berkas persyaratan.",
        )

    upload_dir = settings.upload_path.resolve()
    file_path = (upload_dir / applicant.berkas_path).resolve()
    if not file_path.is_relative_to(upload_dir) or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Berkas tidak ditemukan di penyimpanan server.",
        )

    media_type, _ = mimetypes.guess_type(str(file_path))
    return FileResponse(
        path=file_path,
        media_type=media_type or "application/octet-stream",
        filename=file_path.name,
        content_disposition_type="inline",
    )
