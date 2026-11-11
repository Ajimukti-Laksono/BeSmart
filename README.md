# BeasiswaSmart (BeSmart)

**BeasiswaSmart (BeSmart)** adalah aplikasi web Sistem Pendukung Keputusan (SPK) untuk penentuan penerima beasiswa menggunakan implementasi algoritma **ARAS (*Additive Ratio Assessment*)**. Proyek ini dirancang dengan arsitektur *decoupled* (FastAPI REST API + React SPA) untuk memastikan transparansi penilaian, validasi ketat, dan kemudahan verifikasi hasil terhadap perhitungan manual di Microsoft Excel.

---

## Fitur Utama & Kontrol Akses (RBAC)

1. **Admin (Pimpinan / Pembuat Keputusan)**
   - Dashboard ringkasan statistik pendaftar, kuota periode aktif, status bobot kriteria, serta grafik perbandingan.
   - Manajemen user (`admin`, `panitia`, `mahasiswa`).
   - Manajemen periode beasiswa (kuota penerima, status `buka` / `proses` / `selesai`, aktif/nonaktif).
   - Manajemen kriteria `benefit`/`cost` dan bobot dengan indikator validasi wajib total bobot = `1.0000`.
   - Eksekusi **Kalkulasi ARAS Interaktif** dengan tampilan breakdown 6 tahap (*Matriks Awal + $A_0$*, *Normalisasi $R$*, *Matriks Terbobot $D$*, *Optimalisasi $S_i$ & $S_0$*, *Derajat Utilitas $K_i$*, dan *Ranking & Kelulusan*).
   - Grafik perbandingan $K_i$ (Recharts) serta ekspor laporan SK **PDF** (`jsPDF` + `jspdf-autotable`) dan **Excel** (`.xlsx` via SheetJS).

2. **Panitia (Verifikator)**
   - Tabel verifikasi pendaftar lengkap dengan filter periode, status (`pending`/`verified`/`rejected`), pencarian NIM/nama/prodi, dan preview berkas (PDF/gambar).
   - Aksi verifikasi/penolakan pendaftar (hanya pendaftar `verified` yang masuk ke kalkulasi ARAS).
   - Pemantauan hasil seleksi dan ekspor rekapitulasi.

3. **Mahasiswa (Pendaftar)**
   - Registrasi mandiri dan login JWT.
   - Pengisian formulir biodata, input nilai kriteria dinamis, dan unggah berkas persyaratan (PDF/JPG/PNG, maks 5 MB).
   - Pemantauan status verifikasi berkas dan **pengumuman kelulusan** (hanya terbuka setelah periode berstatus `selesai`).

---

## Tech Stack

| Layer | Teknologi |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Headless UI, Axios, React Router, Recharts, jsPDF + jspdf-autotable, SheetJS (`xlsx`) |
| **Backend** | Python 3.10+, FastAPI, NumPy, SQLAlchemy 2.0, PyMySQL, Alembic, Pydantic v2, `python-jose` (JWT), `passlib` + `bcrypt`, `pytest` |
| **Database** | MySQL 8.0+ |
| **Tooling** | Git, Postman Collection (`postman/besmart.postman_collection.json`), `.env` & `.env.example` |

---

## Struktur Proyek

```text
BeSmart/
├── backend/
│   ├── alembic/                 # Konfigurasi & migrasi skema MySQL
│   ├── app/
│   │   ├── core/                # config, security (JWT/bcrypt), dependencies, exceptions
│   │   ├── db/                  # base, session, seed.py
│   │   ├── models/              # 7 model SQLAlchemy + TimestampMixin
│   │   ├── routers/             # auth, users, periods, criteria, applicants, aras
│   │   ├── schemas/             # Validasi Pydantic request/response
│   │   ├── services/            # aras_engine.py (murni NumPy), aras_service.py
│   │   └── main.py              # Entrypoint FastAPI & Swagger (/docs)
│   ├── tests/                   # test_aras_engine.py, test_api.py, test_auth_and_users.py, dll.
│   ├── uploads/                 # Penyimpanan lokal berkas pendaftar
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios client & modul API per domain
│   │   ├── components/          # Route guards, modals, badges, preview berkas
│   │   ├── context/             # AuthContext, ToastContext
│   │   ├── hooks/               # useAuth, useToast
│   │   ├── layouts/             # AuthLayout, DashboardLayout
│   │   ├── pages/               # Halaman Admin, Panitia, Mahasiswa, Auth
│   │   └── utils/               # Error parser, role helpers, ekspor PDF/Excel
│   ├── package.json
│   └── .env.example
├── docs/                        # erd.md, aras_flow.md, aras_manual_calculation.md, sdlc.md
├── postman/                     # besmart.postman_collection.json
└── README.md
```

---

## Cara Instalasi & Menjalankan

### 1. Persiapan Database MySQL 8.0+
Pastikan service MySQL 8.0+ berjalan (misal melalui Laragon / MySQL Server), lalu buat database:

```sql
CREATE DATABASE IF NOT EXISTS besmart_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2. Setup & Jalankan Backend (FastAPI)

```powershell
cd backend

# 1. Buat virtual environment dan aktifkan
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Instal dependensi
python -m pip install -r requirements.txt

# 3. Salin dan sesuaikan file .env (ubah DATABASE_URL & JWT_SECRET_KEY jika perlu)
copy .env.example .env

# 4. Jalankan migrasi tabel MySQL
python -m alembic upgrade head

# 5. Isi data demo awal (admin, panitia, kriteria, periode, 18 pendaftar dummy)
python -m app.db.seed

# 6. Jalankan server API (pilih salah satu cara singkat di bawah)
python run.py
# atau dari dalam backend/: .\start.bat
# atau dari root BeSmart/: .\start-backend.bat
```

- Dokumentasi interaktif Swagger UI tersedia di: `http://localhost:8000/docs`
- Health check API: `http://localhost:8000/api/health`

### 3. Setup & Jalankan Frontend (React + Vite)

```powershell
cd frontend

# 1. Instal dependensi
npm install

# 2. Salin konfigurasi environment
copy .env.example .env

# 3. Jalankan development server (atau jalankan .\start-frontend.bat dari root)
npm run dev
```

Aplikasi web dapat diakses melalui `http://localhost:5173`.

---

## Akun Demo (Hasil `seed.py`)

| Peran | Email | Password | Catatan |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@besmart.ac.id` | `Admin123!` | Akses penuh, kelola kriteria, jalankan ARAS & publikasi |
| **Panitia** | `panitia@besmart.ac.id` | `Panitia123!` | Verifikasi berkas & pantau hasil |
| **Mahasiswa (Verified)** | `mahasiswa1@besmart.ac.id` s.d. `mahasiswa15@besmart.ac.id` | `Mahasiswa123!` | 15 pendaftar berstatus `verified` lengkap dengan nilai C1–C5 |
| **Mahasiswa (Pending)** | `mahasiswa16@besmart.ac.id`, `mahasiswa17@besmart.ac.id` | `Mahasiswa123!` | Contoh antrian untuk pengujian verifikasi panitia |
| **Mahasiswa (Rejected)** | `mahasiswa18@besmart.ac.id` | `Mahasiswa123!` | Contoh pendaftar berstatus `rejected` |

---

## Daftar Endpoint REST API (Prefix `/api`)

| Method | Endpoint | Peran | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Publik | Cek status layanan & koneksi MySQL |
| `POST` | `/api/auth/register` | Publik | Registrasi akun mahasiswa baru |
| `POST` | `/api/auth/login` | Publik | Login dan penerbitan JWT Bearer token |
| `GET` | `/api/auth/me` | Semua (Login) | Profil akun aktif saat ini |
| `GET/POST/PUT/DELETE` | `/api/users` | Admin | Manajemen seluruh akun pengguna |
| `GET` | `/api/periods` | Semua (Login) | Daftar periode beasiswa & statistik pendaftar |
| `POST/PUT/DELETE` | `/api/periods` | Admin | Tambah, ubah, atau hapus periode |
| `PATCH` | `/api/periods/{id}/status` | Admin | Ubah status periode (`buka`/`proses`/`selesai`) |
| `GET` | `/api/criteria` | Semua (Login) | Daftar kriteria + indikator `total_bobot` & `is_valid_weight` |
| `POST/PUT/DELETE` | `/api/criteria` | Admin | Tambah, ubah, atau hapus kriteria |
| `GET` | `/api/applicants` | Semua (Login) | Daftar pendaftar (mahasiswa hanya melihat miliknya) |
| `POST/PUT` | `/api/applicants` | Mahasiswa / Admin | Ajukan atau perbarui biodata pendaftaran |
| `POST/PUT` | `/api/applicants/{id}/scores` | Mahasiswa / Admin | Simpan/perbarui nilai kriteria pendaftar |
| `POST` | `/api/applicants/{id}/berkas` | Mahasiswa / Admin | Unggah berkas persyaratan (PDF/JPG/PNG) |
| `GET` | `/api/applicants/{id}/berkas` | Pemilik / Panitia / Admin | Preview atau unduh berkas secara terautentikasi |
| `PATCH` | `/api/applicants/{id}/verify` | Panitia / Admin | Ubah `status_verifikasi` (`pending`/`verified`/`rejected`) |
| `POST` | `/api/aras/calculate/{period_id}` | Admin | Jalankan mesin ARAS, simpan hasil & log snapshot |
| `GET` | `/api/aras/results/{period_id}` | Admin / Panitia / Mahasiswa* | Hasil ranking & breakdown (*mahasiswa hanya saat `selesai`) |

---

## Pengujian & Verifikasi

```powershell
# Jalankan seluruh unit & API tests backend
cd backend
.\.venv\Scripts\python.exe -m pytest

# Verifikasi production build frontend
cd ..\frontend
npm run build
```

Dokumentasi tambahan tersedia di folder `docs/`:
- [ERD Database (Mermaid)](docs/erd.md)
- [Alur & Rumus ARAS](docs/aras_flow.md)
- [Perhitungan Manual ARAS (Acuan Excel)](docs/aras_manual_calculation.md)
- [Ringkasan SDLC](docs/sdlc.md)

