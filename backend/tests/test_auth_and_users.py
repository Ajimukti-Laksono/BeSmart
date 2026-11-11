"""Pengujian REST API autentikasi JWT dan RBAC manajemen pengguna."""

from fastapi.testclient import TestClient

from app.models import User
from tests.conftest import auth_header


def test_register_creates_mahasiswa_and_rejects_duplicate(client: TestClient) -> None:
    """Registrasi publik selalu membentuk akun mahasiswa dan menolak email duplikat."""
    res = client.post(
        "/api/auth/register",
        json={
            "name": "Siti Aisyah",
            "email": "Siti@Example.ac.id",
            "password": "Password123",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["user"]["email"] == "siti@example.ac.id"
    assert data["user"]["role"] == "mahasiswa"

    dup_res = client.post(
        "/api/auth/register",
        json={
            "name": "Siti Lain",
            "email": "siti@example.ac.id",
            "password": "Password123",
        },
    )
    assert dup_res.status_code == 409


def test_login_and_get_me_flow(client: TestClient, seed_users: dict[str, User]) -> None:
    """Login kredensial valid mengembalikan JWT yang dapat dipakai pada GET /auth/me."""
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@besmart.ac.id", "password": "Admin123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "admin"
    assert me_res.json()["email"] == "admin@besmart.ac.id"

    bad_login = client.post(
        "/api/auth/login",
        json={"email": "admin@besmart.ac.id", "password": "SalahPassword"},
    )
    assert bad_login.status_code == 401

    no_auth = client.get("/api/auth/me")
    assert no_auth.status_code == 401


def test_users_crud_requires_admin_role(
    client: TestClient,
    seed_users: dict[str, User],
) -> None:
    """Endpoint /api/users hanya boleh diakses admin; panitia & mahasiswa ditolak (403)."""
    assert client.get("/api/users").status_code == 401
    assert client.get("/api/users", headers=auth_header(seed_users["panitia"])).status_code == 403
    assert client.get("/api/users", headers=auth_header(seed_users["mahasiswa"])).status_code == 403

    admin_headers = auth_header(seed_users["admin"])
    list_res = client.get("/api/users", headers=admin_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 3

    create_res = client.post(
        "/api/users",
        headers=admin_headers,
        json={
            "name": "Panitia Dua",
            "email": "panitia2@besmart.ac.id",
            "password": "Password123",
            "role": "panitia",
        },
    )
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    update_res = client.put(
        f"/api/users/{created_id}",
        headers=admin_headers,
        json={"name": "Panitia Dua Updated"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Panitia Dua Updated"

    # Admin dilarang menghapus akunnya sendiri
    self_del = client.delete(
        f"/api/users/{seed_users['admin'].id}",
        headers=admin_headers,
    )
    assert self_del.status_code == 400

    del_res = client.delete(f"/api/users/{created_id}", headers=admin_headers)
    assert del_res.status_code == 200

