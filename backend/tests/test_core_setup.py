"""Smoke test untuk FastAPI app setup, skema tabel SQLAlchemy, dan relasi model."""

from decimal import Decimal

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.main import app
from app.models import (
    Applicant,
    ApplicantScore,
    ArasCalculationLog,
    ArasResult,
    Base,
    Criterion,
    CriterionType,
    EligibilityStatus,
    PeriodStatus,
    ScholarshipPeriod,
    User,
    UserRole,
    VerificationStatus,
)


def _create_sqlite_session() -> Session:
    """Membuat sesi SQLite in-memory dengan dukungan foreign key & check constraint."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestingSession()


def test_fastapi_root_and_health_endpoints() -> None:
    """Memastikan aplikasi FastAPI merespons endpoint root dan health check."""
    client = TestClient(app)
    root_res = client.get("/")
    assert root_res.status_code == 200
    assert root_res.json()["docs"] == "/docs"

    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    payload = health_res.json()
    assert payload["status"] in {"ok", "degraded"}
    assert "database" in payload


def test_sqlalchemy_all_tables_and_constraints_created() -> None:
    """Memastikan seluruh 7 tabel beserta unique dan check constraint terbentuk dengan benar."""
    session = _create_sqlite_session()
    try:
        inspector = inspect(session.get_bind())
        tables = set(inspector.get_table_names())
        assert {
            "users",
            "scholarship_periods",
            "criteria",
            "applicants",
            "applicant_scores",
            "aras_results",
            "aras_calculation_logs",
        }.issubset(tables)

        user = User(
            name="Budi Mahasiswa",
            email="budi@example.ac.id",
            password_hash="hashed_secret",
            role=UserRole.MAHASISWA,
        )
        period = ScholarshipPeriod(
            nama_periode="Beasiswa Prestasi 2026",
            kuota_penerima=5,
            status=PeriodStatus.BUKA,
            is_active=True,
        )
        criterion = Criterion(
            kode_kriteria="C1",
            nama_kriteria="IPK",
            tipe=CriterionType.BENEFIT,
            bobot=Decimal("0.4000"),
        )
        session.add_all([user, period, criterion])
        session.flush()

        applicant = Applicant(
            period_id=period.id,
            user_id=user.id,
            nim="2201001",
            nama_lengkap="Budi Mahasiswa",
            program_studi="Teknik Informatika",
            status_verifikasi=VerificationStatus.VERIFIED,
        )
        session.add(applicant)
        session.flush()

        score = ApplicantScore(
            applicant_id=applicant.id,
            criterion_id=criterion.id,
            nilai_input=Decimal("3.8500"),
        )
        aras_res = ArasResult(
            period_id=period.id,
            applicant_id=applicant.id,
            nilai_si=Decimal("0.30000000"),
            nilai_ki=Decimal("0.95000000"),
            ranking=1,
            status_lolos=EligibilityStatus.LOLOS,
        )
        log = ArasCalculationLog(
            period_id=period.id,
            snapshot={"optimal_row_a0": [3.85], "rankings": [1]},
        )
        session.add_all([score, aras_res, log])
        session.commit()

        assert applicant.created_at is not None
        assert applicant.updated_at is not None

        # Verifikasi unique constraint (period_id, user_id) pada tabel applicants
        duplicate_applicant = Applicant(
            period_id=period.id,
            user_id=user.id,
            nim="2201001",
            nama_lengkap="Duplikat",
            program_studi="Teknik Informatika",
        )
        session.add(duplicate_applicant)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

        # Verifikasi check constraint kuota_penerima > 0
        bad_period = ScholarshipPeriod(
            nama_periode="Periode Invalid",
            kuota_penerima=0,
        )
        session.add(bad_period)
        with pytest.raises(IntegrityError):
            session.commit()
    finally:
        session.close()

