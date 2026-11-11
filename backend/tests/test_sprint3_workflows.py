"""Pengujian REST API Sprint 3: periode, kriteria, pendaftaran mahasiswa, berkas, dan verifikasi."""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.models import User
from tests.conftest import auth_header


def test_periods_crud_and_status_rbac(
    client: TestClient,
    seed_users: dict[str, User],
) -> None:
    """Admin dapat CRUD periode dan ubah status; panitia/mahasiswa hanya boleh membaca."""
    admin_headers = auth_header(seed_users["admin"])
    panitia_headers = auth_header(seed_users["panitia"])
    mhs_headers = auth_header(seed_users["mahasiswa"])

    # Mahasiswa/panitia tidak bisa membuat periode
    assert (
        client.post(
            "/api/periods",
            headers=mhs_headers,
            json={"nama_periode": "Illegal", "kuota_penerima": 2},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/periods",
            headers=panitia_headers,
            json={"nama_periode": "Illegal", "kuota_penerima": 2},
        ).status_code
        == 403
    )

    # Admin membuat periode
    create_res = client.post(
        "/api/periods",
        headers=admin_headers,
        json={"nama_periode": "Beasiswa Unggulan 2026", "kuota_penerima": 5},
    )
    assert create_res.status_code == 201
    period_id = create_res.json()["id"]
    assert create_res.json()["status"] == "buka"

    # Semua peran dapat membaca daftar periode
    assert client.get("/api/periods", headers=mhs_headers).status_code == 200

    # Admin ubah status via PATCH
    patch_res = client.patch(
        f"/api/periods/{period_id}/status",
        headers=admin_headers,
        json={"status": "proses"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "proses"

    # Kuota <= 0 ditolak validasi Pydantic
    bad_res = client.post(
        "/api/periods",
        headers=admin_headers,
        json={"nama_periode": "Kuota Nol", "kuota_penerima": 0},
    )
    assert bad_res.status_code == 422

    # Hapus periode
    assert client.delete(f"/api/periods/{period_id}", headers=admin_headers).status_code == 200


def test_criteria_crud_and_weight_indicator(
    client: TestClient,
    seed_users: dict[str, User],
) -> None:
    """Menguji CRUD kriteria dan indikator total bobot (validasi == 1.0)."""
    admin_headers = auth_header(seed_users["admin"])
    mhs_headers = auth_header(seed_users["mahasiswa"])

    assert (
        client.post(
            "/api/criteria",
            headers=mhs_headers,
            json={"kode_kriteria": "C1", "nama_kriteria": "IPK", "tipe": "benefit", "bobot": 0.5},
        ).status_code
        == 403
    )

    r1 = client.post(
        "/api/criteria",
        headers=admin_headers,
        json={"kode_kriteria": "c1", "nama_kriteria": "IPK", "tipe": "benefit", "bobot": 0.6},
    )
    assert r1.status_code == 201
    assert r1.json()["kode_kriteria"] == "C1"

    # Saat total bobot 0.6 -> is_valid_weight False
    list_mid = client.get("/api/criteria", headers=admin_headers).json()
    assert list_mid["total_bobot"] == 0.6
    assert list_mid["is_valid_weight"] is False

    # Tambah C2 = 0.4 -> total bobot 1.0 -> is_valid_weight True
    r2 = client.post(
        "/api/criteria",
        headers=admin_headers,
        json={
            "kode_kriteria": "C2",
            "nama_kriteria": "Penghasilan Orang Tua",
            "tipe": "cost",
            "bobot": 0.4,
        },
    )
    assert r2.status_code == 201

    list_full = client.get("/api/criteria", headers=mhs_headers).json()
    assert list_full["total_bobot"] == 1.0
    assert list_full["is_valid_weight"] is True

    # Duplikat kode ditolak
    dup = client.post(
        "/api/criteria",
        headers=admin_headers,
        json={"kode_kriteria": "C1", "nama_kriteria": "Dup", "tipe": "benefit", "bobot": 0.1},
    )
    assert dup.status_code == 409


def test_applicant_registration_scores_upload_and_panitia_verification(
    client: TestClient,
    seed_users: dict[str, User],
    tmp_path,
    monkeypatch,
) -> None:
    """Alur lengkap: mahasiswa daftar + isi nilai + upload berkas -> panitia verifikasi."""
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))

    admin_headers = auth_header(seed_users["admin"])
    panitia_headers = auth_header(seed_users["panitia"])
    mhs_headers = auth_header(seed_users["mahasiswa"])

    period = client.post(
        "/api/periods",
        headers=admin_headers,
        json={"nama_periode": "Periode Test 2026", "kuota_penerima": 2},
    ).json()
    c1 = client.post(
        "/api/criteria",
        headers=admin_headers,
        json={"kode_kriteria": "C1", "nama_kriteria": "IPK", "tipe": "benefit", "bobot": 0.6},
    ).json()
    c2 = client.post(
        "/api/criteria",
        headers=admin_headers,
        json={
            "kode_kriteria": "C2",
            "nama_kriteria": "Penghasilan",
            "tipe": "cost",
            "bobot": 0.4,
        },
    ).json()

    # Daftar mahasiswa
    reg_res = client.post(
        "/api/applicants",
        headers=mhs_headers,
        json={
            "period_id": period["id"],
            "nim": "23010099",
            "nama_lengkap": "Mahasiswa Uji",
            "program_studi": "Teknik Informatika",
        },
    )
    assert reg_res.status_code == 201
    applicant_id = reg_res.json()["id"]
    assert reg_res.json()["status_verifikasi"] == "pending"

    # Pendaftaran ganda pada periode yang sama ditolak (409)
    dup_reg = client.post(
        "/api/applicants",
        headers=mhs_headers,
        json={
            "period_id": period["id"],
            "nim": "23010099",
            "nama_lengkap": "Mahasiswa Uji",
            "program_studi": "Teknik Informatika",
        },
    )
    assert dup_reg.status_code == 409

    # Nilai cost <= 0 ditolak
    bad_score = client.post(
        f"/api/applicants/{applicant_id}/scores",
        headers=mhs_headers,
        json={
            "scores": [
                {"criterion_id": c1["id"], "nilai_input": 3.85},
                {"criterion_id": c2["id"], "nilai_input": 0},
            ]
        },
    )
    assert bad_score.status_code == 422

    # Nilai valid disimpan
    ok_score = client.put(
        f"/api/applicants/{applicant_id}/scores",
        headers=mhs_headers,
        json={
            "scores": [
                {"criterion_id": c1["id"], "nilai_input": 3.85},
                {"criterion_id": c2["id"], "nilai_input": 2.5},
            ]
        },
    )
    assert ok_score.status_code == 200
    assert len(ok_score.json()["scores"]) == 2

    # Upload berkas PDF
    upload_res = client.post(
        f"/api/applicants/{applicant_id}/berkas",
        headers=mhs_headers,
        files={"file": ("transkrip.pdf", b"%PDF-1.4 dummy content", "application/pdf")},
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["has_berkas"] is True

    # Mahasiswa tidak boleh memverifikasi dirinya sendiri
    assert (
        client.patch(
            f"/api/applicants/{applicant_id}/verify",
            headers=mhs_headers,
            json={"status_verifikasi": "verified"},
        ).status_code
        == 403
    )

    # Panitia memverifikasi dan dapat preview berkas
    berkas_res = client.get(
        f"/api/applicants/{applicant_id}/berkas",
        headers=panitia_headers,
    )
    assert berkas_res.status_code == 200
    assert berkas_res.content.startswith(b"%PDF-1.4")

    verify_res = client.patch(
        f"/api/applicants/{applicant_id}/verify",
        headers=panitia_headers,
        json={"status_verifikasi": "verified"},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status_verifikasi"] == "verified"

    # Setelah diverifikasi, mahasiswa tidak boleh mengubah nilai kriteria lagi
    locked_res = client.put(
        f"/api/applicants/{applicant_id}/scores",
        headers=mhs_headers,
        json={"scores": [{"criterion_id": c1["id"], "nilai_input": 4.0}]},
    )
    assert locked_res.status_code == 400


def test_upload_validation_and_applicant_isolation(
    client: TestClient,
    seed_users: dict[str, User],
    tmp_path,
    monkeypatch,
) -> None:
    """Menguji penolakan format file tidak valid, ukuran > max, dan isolasi akses antarmahasiswa."""
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 1)

    admin_headers = auth_header(seed_users["admin"])
    mhs_a_headers = auth_header(seed_users["mahasiswa"])
    reg_b = client.post(
        "/api/auth/register",
        json={"name": "Mahasiswa Lain", "email": "lain@besmart.ac.id", "password": "Password123"},
    )
    mhs_b_headers = {"Authorization": f"Bearer {reg_b.json()['access_token']}"}

    period = client.post(
        "/api/periods",
        headers=admin_headers,
        json={"nama_periode": "Periode Upload Test", "kuota_penerima": 1},
    ).json()

    app_a = client.post(
        "/api/applicants",
        headers=mhs_a_headers,
        json={
            "period_id": period["id"],
            "nim": "2301999",
            "nama_lengkap": "Mahasiswa A",
            "program_studi": "Informatika",
        },
    ).json()

    # Ekstensi terlarang (.exe) ditolak
    bad_ext = client.post(
        f"/api/applicants/{app_a['id']}/berkas",
        headers=mhs_a_headers,
        files={"file": ("malware.exe", b"MZ", "application/octet-stream")},
    )
    assert bad_ext.status_code == 400

    # Ukuran > 1 MB ditolak (413)
    too_large = client.post(
        f"/api/applicants/{app_a['id']}/berkas",
        headers=mhs_a_headers,
        files={"file": ("big.pdf", b"0" * (1024 * 1024 + 10), "application/pdf")},
    )
    assert too_large.status_code == 413

    # Mahasiswa B tidak boleh mengakses detail atau berkas Mahasiswa A (403)
    assert (
        client.get(f"/api/applicants/{app_a['id']}", headers=mhs_b_headers).status_code == 403
    )
    assert (
        client.get(f"/api/applicants/{app_a['id']}/berkas", headers=mhs_b_headers).status_code == 403
    )

