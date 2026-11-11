"""Layanan orkestrasi kalkulasi ARAS antara database SQLAlchemy dan ArasEngine."""

from datetime import datetime, timezone
import re
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ArasValidationError
from app.models.applicant import Applicant, VerificationStatus
from app.models.aras_calculation_log import ArasCalculationLog
from app.models.aras_result import ArasResult, EligibilityStatus
from app.models.criterion import Criterion
from app.models.scholarship_period import PeriodStatus, ScholarshipPeriod
from app.models.user import User, UserRole
from app.schemas.aras import (
    ArasApplicantSnapshot,
    ArasBreakdown,
    ArasCriterionSnapshot,
    ArasResultItem,
    ArasResultsResponse,
)
from app.services.aras_engine import ArasEngine


def _criterion_sort_key(criterion: Criterion) -> tuple[int, str]:
    match = re.search(r"(\d+)", criterion.kode_kriteria)
    return (int(match.group(1)) if match else 999999, criterion.kode_kriteria)


class ArasService:
    """Service layer untuk menjalankan perhitungan ARAS dan mengambil hasil tersimpan."""

    @staticmethod
    def calculate_for_period(
        db: Session,
        period_id: int,
        publish: bool = False,
    ) -> ArasResultsResponse:
        """Mengambil pendaftar verified dan kriteria, menjalankan ArasEngine, dan menyimpan log."""
        period = db.get(ScholarshipPeriod, period_id)
        if period is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Periode beasiswa tidak ditemukan.",
            )

        criteria = list(db.scalars(select(Criterion)).all())
        criteria.sort(key=_criterion_sort_key)
        if not criteria:
            raise ArasValidationError(
                "Belum ada kriteria penilaian yang dikonfigurasi di sistem."
            )

        verified_applicants = list(
            db.scalars(
                select(Applicant)
                .options(selectinload(Applicant.scores))
                .where(
                    Applicant.period_id == period_id,
                    Applicant.status_verifikasi == VerificationStatus.VERIFIED,
                )
                .order_by(Applicant.id.asc())
            ).all()
        )
        if not verified_applicants:
            raise ArasValidationError(
                "Tidak ada pendaftar berstatus 'verified' pada periode ini untuk dihitung."
            )

        # Bangun matriks keputusan X (m x n) sambil memvalidasi kelengkapan nilai
        matrix_x: list[list[float]] = []
        incomplete_errors: list[str] = []
        for applicant in verified_applicants:
            score_map = {score.criterion_id: float(score.nilai_input) for score in applicant.scores}
            missing_codes = [c.kode_kriteria for c in criteria if c.id not in score_map]
            if missing_codes:
                incomplete_errors.append(
                    f"{applicant.nim} ({applicant.nama_lengkap}) belum mengisi kriteria: {', '.join(missing_codes)}"
                )
            else:
                matrix_x.append([score_map[c.id] for c in criteria])

        if incomplete_errors:
            raise ArasValidationError(
                "Terdapat pendaftar terverifikasi yang belum melengkapi seluruh nilai kriteria.",
                errors=incomplete_errors,
            )

        weights = [float(c.bobot) for c in criteria]
        criteria_types = [c.tipe.value for c in criteria]
        statuses = [a.status_verifikasi.value for a in verified_applicants]

        engine_output = ArasEngine.calculate(
            matrix_x=matrix_x,
            weights=weights,
            criteria_types=criteria_types,
            quota=period.kuota_penerima,
            verification_statuses=statuses,
        )

        calculated_at = datetime.now(timezone.utc).replace(tzinfo=None)

        # Hapus hasil kalkulasi periode sebelumnya agar bersih saat hitung ulang
        db.execute(delete(ArasResult).where(ArasResult.period_id == period_id))
        db.flush()

        for idx, applicant in enumerate(verified_applicants):
            db.add(
                ArasResult(
                    period_id=period_id,
                    applicant_id=applicant.id,
                    nilai_si=round(engine_output["si_values"][idx], 8),
                    nilai_ki=round(engine_output["ki_values"][idx], 8),
                    ranking=int(engine_output["rankings"][idx]),
                    status_lolos=EligibilityStatus(engine_output["eligibility_statuses"][idx]),
                    calculated_at=calculated_at,
                )
            )

        criteria_snapshot = [
            {
                "id": c.id,
                "kode_kriteria": c.kode_kriteria,
                "nama_kriteria": c.nama_kriteria,
                "tipe": c.tipe.value,
                "bobot": float(c.bobot),
            }
            for c in criteria
        ]
        applicants_snapshot = [
            {
                "applicant_id": a.id,
                "user_id": a.user_id,
                "nim": a.nim,
                "nama_lengkap": a.nama_lengkap,
                "program_studi": a.program_studi,
            }
            for a in verified_applicants
        ]

        log_snapshot = {
            "criteria": criteria_snapshot,
            "applicants": applicants_snapshot,
            "optimal_row_a0": engine_output["optimal_row_a0"],
            "extended_matrix": engine_output["extended_matrix"],
            "normalized_matrix_r": engine_output["normalized_matrix_r"],
            "weighted_matrix_d": engine_output["weighted_matrix_d"],
            "s0": engine_output["s0"],
            "si_values": engine_output["si_values"],
            "si_with_a0": engine_output["si_with_a0"],
            "ki_values": engine_output["ki_values"],
            "ki_with_a0": engine_output["ki_with_a0"],
            "rankings": engine_output["rankings"],
            "eligibility_statuses": engine_output["eligibility_statuses"],
            "calculated_at": calculated_at.isoformat(),
        }

        db.add(
            ArasCalculationLog(
                period_id=period_id,
                snapshot=log_snapshot,
            )
        )

        # Perbarui status periode sesuai hasil kalkulasi
        if publish:
            period.status = PeriodStatus.SELESAI
        elif period.status == PeriodStatus.BUKA:
            period.status = PeriodStatus.PROSES

        db.commit()
        db.refresh(period)

        return ArasService._build_results_response(
            db=db,
            period=period,
            include_breakdown=True,
            viewer_user_id=None,
        )

    @staticmethod
    def get_results_for_period(
        db: Session,
        period_id: int,
        current_user: User,
    ) -> ArasResultsResponse:
        """Mengambil hasil ranking dan breakdown langkah demi langkah sesuai otorisasi peran."""
        period = db.get(ScholarshipPeriod, period_id)
        if period is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Periode beasiswa tidak ditemukan.",
            )

        if (
            current_user.role == UserRole.MAHASISWA
            and period.status != PeriodStatus.SELESAI
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Pengumuman kelulusan hanya dapat dilihat setelah periode berstatus 'selesai'.",
            )

        include_breakdown = current_user.role in {UserRole.ADMIN, UserRole.PANITIA}
        viewer_user_id = (
            current_user.id if current_user.role == UserRole.MAHASISWA else None
        )
        return ArasService._build_results_response(
            db=db,
            period=period,
            include_breakdown=include_breakdown,
            viewer_user_id=viewer_user_id,
        )

    @staticmethod
    def _build_results_response(
        db: Session,
        period: ScholarshipPeriod,
        include_breakdown: bool,
        viewer_user_id: Optional[int],
    ) -> ArasResultsResponse:
        """Menyusun response hasil ARAS dari tabel aras_results dan aras_calculation_logs."""
        result_rows = list(
            db.scalars(
                select(ArasResult)
                .options(selectinload(ArasResult.applicant))
                .where(ArasResult.period_id == period.id)
                .order_by(ArasResult.ranking.asc(), ArasResult.nilai_ki.desc())
            ).all()
        )

        if not result_rows:
            return ArasResultsResponse(
                period_id=period.id,
                nama_periode=period.nama_periode,
                kuota_penerima=period.kuota_penerima,
                period_status=period.status,
                has_results=False,
            )

        items = [
            ArasResultItem(
                applicant_id=row.applicant_id,
                user_id=row.applicant.user_id,
                nim=row.applicant.nim,
                nama_lengkap=row.applicant.nama_lengkap,
                program_studi=row.applicant.program_studi,
                nilai_si=float(row.nilai_si),
                nilai_ki=float(row.nilai_ki),
                ranking=row.ranking,
                status_lolos=row.status_lolos,
                calculated_at=row.calculated_at,
            )
            for row in result_rows
        ]

        my_result = None
        if viewer_user_id is not None:
            my_result = next(
                (item for item in items if item.user_id == viewer_user_id),
                None,
            )

        breakdown: Optional[ArasBreakdown] = None
        if include_breakdown:
            latest_log = db.scalar(
                select(ArasCalculationLog)
                .where(ArasCalculationLog.period_id == period.id)
                .order_by(ArasCalculationLog.id.desc())
            )
            if latest_log is not None and latest_log.snapshot:
                snap = latest_log.snapshot
                breakdown = ArasBreakdown(
                    criteria=[ArasCriterionSnapshot(**c) for c in snap["criteria"]],
                    applicants=[ArasApplicantSnapshot(**a) for a in snap["applicants"]],
                    optimal_row_a0=snap["optimal_row_a0"],
                    extended_matrix=snap["extended_matrix"],
                    normalized_matrix_r=snap["normalized_matrix_r"],
                    weighted_matrix_d=snap["weighted_matrix_d"],
                    s0=snap["s0"],
                    si_values=snap["si_values"],
                    si_with_a0=snap["si_with_a0"],
                    ki_values=snap["ki_values"],
                    ki_with_a0=snap["ki_with_a0"],
                    rankings=snap["rankings"],
                    eligibility_statuses=[
                        EligibilityStatus(val) for val in snap["eligibility_statuses"]
                    ],
                )

        total_lolos = sum(1 for item in items if item.status_lolos == EligibilityStatus.LOLOS)

        return ArasResultsResponse(
            period_id=period.id,
            nama_periode=period.nama_periode,
            kuota_penerima=period.kuota_penerima,
            period_status=period.status,
            has_results=True,
            calculated_at=items[0].calculated_at,
            total_candidates=len(items),
            total_lolos=total_lolos,
            results=items,
            breakdown=breakdown,
            my_result=my_result,
        )

