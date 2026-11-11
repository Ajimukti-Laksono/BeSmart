"""Script seed data awal untuk database BeasiswaSmart (BeSmart).

Jalankan dari direktori backend:
    python -m app.db.seed
"""

from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import (
    Applicant,
    ApplicantScore,
    Criterion,
    CriterionType,
    PeriodStatus,
    ScholarshipPeriod,
    User,
    UserRole,
    VerificationStatus,
)

# Dataset pendaftar dummy: 15 verified + 2 pending + 1 rejected
# Format: (nama, email, nim, prodi, status_verifikasi, [C1_IPK, C2_PenghasilanJuta, C3_Tanggungan, C4_Prestasi, C5_Semester])
DUMMY_APPLICANTS: list[tuple[str, str, str, str, VerificationStatus, list[float]]] = [
    ("Andi Pratama", "mahasiswa1@besmart.ac.id", "2301001", "Teknik Informatika", VerificationStatus.VERIFIED, [3.92, 1.80, 4, 88, 6]),
    ("Budi Santoso", "mahasiswa2@besmart.ac.id", "2301002", "Sistem Informasi", VerificationStatus.VERIFIED, [3.78, 2.50, 3, 75, 4]),
    ("Citra Lestari", "mahasiswa3@besmart.ac.id", "2301003", "Teknik Informatika", VerificationStatus.VERIFIED, [3.95, 3.20, 2, 92, 6]),
    ("Dewi Anggraini", "mahasiswa4@besmart.ac.id", "2301004", "Ilmu Komputer", VerificationStatus.VERIFIED, [3.65, 1.20, 5, 70, 4]),
    ("Eko Wijaya", "mahasiswa5@besmart.ac.id", "2301005", "Teknik Elektro", VerificationStatus.VERIFIED, [3.50, 4.50, 2, 60, 6]),
    ("Fitri Handayani", "mahasiswa6@besmart.ac.id", "2301006", "Teknik Informatika", VerificationStatus.VERIFIED, [3.85, 1.50, 4, 84, 6]),
    ("Gilang Ramadhan", "mahasiswa7@besmart.ac.id", "2301007", "Sistem Informasi", VerificationStatus.VERIFIED, [3.42, 5.00, 1, 55, 4]),
    ("Hana Permata", "mahasiswa8@besmart.ac.id", "2301008", "Data Science", VerificationStatus.VERIFIED, [3.89, 2.00, 3, 86, 6]),
    ("Indra Kusuma", "mahasiswa9@besmart.ac.id", "2301009", "Teknik Informatika", VerificationStatus.VERIFIED, [3.60, 2.80, 3, 65, 4]),
    ("Julia Maharani", "mahasiswa10@besmart.ac.id", "2301010", "Ilmu Komputer", VerificationStatus.VERIFIED, [3.74, 1.60, 4, 78, 6]),
    ("Kurniawan Putra", "mahasiswa11@besmart.ac.id", "2301011", "Teknik Mesin", VerificationStatus.VERIFIED, [3.35, 3.80, 2, 50, 4]),
    ("Larasati Putri", "mahasiswa12@besmart.ac.id", "2301012", "Sistem Informasi", VerificationStatus.VERIFIED, [3.91, 2.20, 3, 82, 6]),
    ("Muhammad Rizki", "mahasiswa13@besmart.ac.id", "2301013", "Teknik Informatika", VerificationStatus.VERIFIED, [3.58, 1.40, 5, 68, 4]),
    ("Nadia Salsabila", "mahasiswa14@besmart.ac.id", "2301014", "Data Science", VerificationStatus.VERIFIED, [3.82, 3.50, 2, 80, 6]),
    ("Oscar Mahendra", "mahasiswa15@besmart.ac.id", "2301015", "Teknik Elektro", VerificationStatus.VERIFIED, [3.48, 2.70, 3, 62, 4]),
    ("Putri Rahmawati", "mahasiswa16@besmart.ac.id", "2301016", "Teknik Informatika", VerificationStatus.PENDING, [3.70, 2.10, 3, 74, 4]),
    ("Qori Maulana", "mahasiswa17@besmart.ac.id", "2301017", "Sistem Informasi", VerificationStatus.PENDING, [3.55, 1.90, 4, 66, 6]),
    ("Raka Aditya", "mahasiswa18@besmart.ac.id", "2301018", "Teknik Informatika", VerificationStatus.REJECTED, [2.85, 6.00, 1, 30, 2]),
]

DEFAULT_CRITERIA = [
    ("C1", "Indeks Prestasi Kumulatif (IPK)", CriterionType.BENEFIT, Decimal("0.3500"), "Skala 0.00 - 4.00 sesuai transkrip terakhir (contoh: 3.80)"),
    ("C2", "Penghasilan Orang Tua", CriterionType.COST, Decimal("0.0200"), "Pertimbangan ringan (2%): total gabungan per bulan dalam Juta Rupiah, wajib > 0 (contoh: 2.5)"),
    ("C3", "Jumlah Tanggungan Keluarga", CriterionType.BENEFIT, Decimal("0.0600"), "Jumlah anggota keluarga yang masih dibiayai orang tua termasuk pendaftar (contoh: 3)"),
    ("C4", "Skor Prestasi", CriterionType.BENEFIT, Decimal("0.4500"), "Bobot utama (45%): akumulasi poin prestasi tanpa batas maksimal (Kampus=20/prestasi, Provinsi=35/prestasi, Nasional=60/prestasi, Internasional=85/prestasi)"),
    ("C5", "Semester Berjalan", CriterionType.BENEFIT, Decimal("0.1200"), "Semester aktif yang sedang ditempuh untuk mengukur konsistensi IPK per semester (contoh: 4 atau 6)"),
]


def _create_dummy_pdf(upload_dir: Path, filename: str, applicant_name: str, nim: str) -> str:
    """Membuat file PDF minimal yang valid sebagai contoh berkas pendaftar seed."""
    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / filename
    if not target.exists():
        text = f"BeSmart Sample Document - {nim} - {applicant_name}"
        pdf_bytes = (
            b"%PDF-1.4\n"
            b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
            b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
            b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
            b"4 0 obj << /Length "
            + str(len(text) + 34).encode("ascii")
            + b" >> stream\nBT /F1 12 Tf 20 100 Td ("
            + text.encode("ascii", errors="ignore")
            + b") Tj ET\nendstream endobj\n"
            b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
            b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n"
            b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n"
        )
        target.write_bytes(pdf_bytes)
    return filename


def _get_or_create_user(
    db: Session,
    name: str,
    email: str,
    raw_password: str,
    role: UserRole,
) -> User:
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        return existing
    user = User(
        name=name,
        email=email,
        password_hash=get_password_hash(raw_password),
        role=role,
    )
    db.add(user)
    db.flush()
    return user


def seed_database(db: Session, create_sample_files: bool = True) -> dict[str, int]:
    """Mengisi data demo lengkap secara idempoten (aman dijalankan berulang kali)."""
    _get_or_create_user(db, "Administrator BeSmart", "admin@besmart.ac.id", "Admin123!", UserRole.ADMIN)
    _get_or_create_user(db, "Panitia Verifikator", "panitia@besmart.ac.id", "Panitia123!", UserRole.PANITIA)

    period_name = "Beasiswa Prestasi Akademik 2026"
    period = db.scalar(
        select(ScholarshipPeriod).where(ScholarshipPeriod.nama_periode == period_name)
    )
    if period is None:
        period = ScholarshipPeriod(
            nama_periode=period_name,
            kuota_penerima=5,
            status=PeriodStatus.BUKA,
            is_active=True,
        )
        db.add(period)
        db.flush()

    criteria_list: list[Criterion] = []
    for kode, nama, tipe, bobot, ket in DEFAULT_CRITERIA:
        crit = db.scalar(select(Criterion).where(Criterion.kode_kriteria == kode))
        if crit is None:
            crit = Criterion(
                kode_kriteria=kode,
                nama_kriteria=nama,
                tipe=tipe,
                bobot=bobot,
                keterangan=ket,
            )
            db.add(crit)
            db.flush()
        criteria_list.append(crit)

    upload_dir = settings.upload_path.resolve()
    created_applicants = 0

    for nama, email, nim, prodi, status_verif, raw_scores in DUMMY_APPLICANTS:
        mhs_user = _get_or_create_user(
            db, nama, email, "Mahasiswa123!", UserRole.MAHASISWA
        )
        applicant = db.scalar(
            select(Applicant).where(
                Applicant.period_id == period.id,
                Applicant.user_id == mhs_user.id,
            )
        )
        if applicant is None:
            berkas_filename = None
            if create_sample_files:
                berkas_filename = _create_dummy_pdf(
                    upload_dir,
                    f"seed_berkas_{nim}.pdf",
                    nama,
                    nim,
                )

            applicant = Applicant(
                period_id=period.id,
                user_id=mhs_user.id,
                nim=nim,
                nama_lengkap=nama,
                program_studi=prodi,
                berkas_path=berkas_filename,
                status_verifikasi=status_verif,
            )
            db.add(applicant)
            db.flush()
            created_applicants += 1

            for crit, val in zip(criteria_list, raw_scores):
                db.add(
                    ApplicantScore(
                        applicant_id=applicant.id,
                        criterion_id=crit.id,
                        nilai_input=Decimal(str(val)),
                    )
                )

    db.commit()
    return {
        "period_id": period.id,
        "criteria_count": len(criteria_list),
        "total_dummy_applicants": len(DUMMY_APPLICANTS),
        "newly_created_applicants": created_applicants,
    }


def main() -> None:
    """Entrypoint CLI untuk mengisi database dengan data seed awal."""
    db = SessionLocal()
    try:
        summary = seed_database(db, create_sample_files=True)
        print("Seed data BeSmart berhasil dijalankan:", summary)
    finally:
        db.close()


if __name__ == "__main__":
    main()

