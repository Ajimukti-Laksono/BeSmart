"""Pengujian integrasi REST API lengkap: ARAS calculation, RBAC visibility, dan seed data."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.seed import seed_database
from app.models import User
from tests.conftest import auth_header


def test_aras_calculation_and_mahasiswa_visibility_gating(
    client: TestClient,
    db_session: Session,
    seed_users: dict[str, User],
) -> None:
    """Menguji alur ARAS end-to-end: validasi bobot, eksklusi non-verified, dan gate pengumuman."""
    admin_headers = auth_header(seed_users["admin"])
    panitia_headers = auth_header(seed_users["panitia"])
    mhs_headers = auth_header(seed_users["mahasiswa"])

    # Buat periode kuota 1
    period = client.post(
        "/api/periods",
        headers=admin_headers,
        json={"nama_periode": "Beasiswa ARAS Test 2026", "kuota_penerima": 1},
    ).json()
    period_id = period["id"]

    # Tambah kriteria dengan bobot belum 1.0 terlebih dahulu
    c1 = client.post(
        "/api/criteria",
        headers=admin_headers,
        json={"kode_kriteria": "C1", "nama_kriteria": "IPK", "tipe": "benefit", "bobot": 0.6},
    ).json()

    # Daftar mahasiswa A (nanti verified) dan registrasi akun mahasiswa B (pending)
    reg_b = client.post(
        "/api/auth/register",
        json={"name": "Mahasiswa B", "email": "mhsb@besmart.ac.id", "password": "Password123"},
    )
    mhs_b_headers = {"Authorization": f"Bearer {reg_b.json()['access_token']}"}

    app_a = client.post(
        "/api/applicants",
        headers=mhs_headers,
        json={
            "period_id": period_id,
            "nim": "230001",
            "nama_lengkap": "Mahasiswa A",
            "program_studi": "Informatika",
            "scores": [{"criterion_id": c1["id"], "nilai_input": 3.8}],
        },
    ).json()
    _app_b = client.post(
        "/api/applicants",
        headers=mhs_b_headers,
        json={
            "period_id": period_id,
            "nim": "230002",
            "nama_lengkap": "Mahasiswa B",
            "program_studi": "Informatika",
            "scores": [{"criterion_id": c1["id"], "nilai_input": 3.99}],
        },
    ).json()

    # Belum ada pendaftar verified -> ditolak 422
    no_verified = client.post(f"/api/aras/calculate/{period_id}", headers=admin_headers)
    assert no_verified.status_code == 422

    # Verifikasi hanya Mahasiswa A (Mahasiswa B tetap pending)
    client.patch(
        f"/api/applicants/{app_a['id']}/verify",
        headers=panitia_headers,
        json={"status_verifikasi": "verified"},
    )

    # Bobot saat ini 0.6 (!= 1.0) -> kalkulasi harus ditolak
    bad_weight = client.post(f"/api/aras/calculate/{period_id}", headers=admin_headers)
    assert bad_weight.status_code == 422
    assert "bobot" in bad_weight.json()["detail"].lower()

    # Tambah C2 (cost, bobot 0.4 -> total = 1.0)
    c2 = client.post(
        "/api/criteria",
        headers=admin_headers,
        json={"kode_kriteria": "C2", "nama_kriteria": "Penghasilan", "tipe": "cost", "bobot": 0.4},
    ).json()

    # Mahasiswa A belum mengisi nilai C2 -> kalkulasi harus ditolak
    missing_score = client.post(f"/api/aras/calculate/{period_id}", headers=admin_headers)
    assert missing_score.status_code == 422

    # Admin melengkapi nilai C2 untuk Mahasiswa A
    client.put(
        f"/api/applicants/{app_a['id']}/scores",
        headers=admin_headers,
        json={
            "scores": [
                {"criterion_id": c1["id"], "nilai_input": 3.8},
                {"criterion_id": c2["id"], "nilai_input": 2.0},
            ]
        },
    )

    # Mahasiswa/Panitia tidak boleh memicu kalkulasi ARAS (403)
    assert (
        client.post(f"/api/aras/calculate/{period_id}", headers=panitia_headers).status_code == 403
    )
    assert (
        client.post(f"/api/aras/calculate/{period_id}", headers=mhs_headers).status_code == 403
    )

    # Admin menjalankan kalkulasi ARAS -> status periode berpindah dari 'buka' -> 'proses'
    calc_res = client.post(f"/api/aras/calculate/{period_id}", headers=admin_headers)
    assert calc_res.status_code == 200
    calc_data = calc_res.json()
    assert calc_data["has_results"] is True
    assert calc_data["period_status"] == "proses"
    # Hanya Mahasiswa A (verified) yang dihitung, Mahasiswa B (pending) tidak ikut
    assert calc_data["total_candidates"] == 1
    assert calc_data["results"][0]["nim"] == "230001"
    assert calc_data["results"][0]["status_lolos"] == "lolos"
    assert calc_data["breakdown"] is not None

    # Panitia dapat melihat hasil dan breakdown saat status masih 'proses'
    panitia_res = client.get(f"/api/aras/results/{period_id}", headers=panitia_headers)
    assert panitia_res.status_code == 200
    assert panitia_res.json()["breakdown"] is not None

    # Mahasiswa BELUM boleh melihat hasil saat periode masih 'proses'
    mhs_blocked = client.get(f"/api/aras/results/{period_id}", headers=mhs_headers)
    assert mhs_blocked.status_code == 403

    # Admin mempublikasikan hasil (status -> 'selesai')
    pub_res = client.patch(
        f"/api/periods/{period_id}/status",
        headers=admin_headers,
        json={"status": "selesai"},
    )
    assert pub_res.status_code == 200

    # Sekarang mahasiswa boleh melihat pengumuman kelulusannya
    mhs_allowed = client.get(f"/api/aras/results/{period_id}", headers=mhs_headers)
    assert mhs_allowed.status_code == 200
    assert mhs_allowed.json()["my_result"]["status_lolos"] == "lolos"
    assert mhs_allowed.json()["breakdown"] is None


def test_seed_data_and_aras_calculation_end_to_end(
    client: TestClient,
    db_session: Session,
) -> None:
    """Memastikan seed.py idempoten dan menghasilkan 15 pendaftar verified yang siap dihitung ARAS."""
    summary_first = seed_database(db_session, create_sample_files=False)
    summary_second = seed_database(db_session, create_sample_files=False)

    assert summary_first["criteria_count"] == 5
    assert summary_first["newly_created_applicants"] == 18
    assert summary_second["newly_created_applicants"] == 0

    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@besmart.ac.id", "password": "Admin123!"},
    )
    assert login_res.status_code == 200
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    period_id = summary_first["period_id"]
    calc_res = client.post(
        f"/api/aras/calculate/{period_id}",
        headers=admin_headers,
        json={"publish": True},
    )
    assert calc_res.status_code == 200
    body = calc_res.json()
    assert body["total_candidates"] == 15
    assert body["total_lolos"] == 5
    assert body["period_status"] == "selesai"
    assert body["results"][0]["ranking"] == 1

