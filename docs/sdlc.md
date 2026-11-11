# Ringkasan SDLC Proyek BeasiswaSmart (BeSmart)

Pengembangan **BeasiswaSmart (BeSmart)** menerapkan metodologi **Iterative Agile / Sprint-Based SDLC** dalam 5 sprint terstruktur:

## 1. Analisis Kebutuhan & Perancangan (Planning & Design)
- Identifikasi aktor dan hak akses (**RBAC**): `admin` (Pimpinan/Pembuat Keputusan), `panitia` (Verifikator), dan `mahasiswa` (Pendaftar).
- Perancangan arsitektur **decoupled** (REST API FastAPI + React SPA) dan skema 7 tabel MySQL (`users`, `scholarship_periods`, `criteria`, `applicants`, `applicant_scores`, `aras_results`, `aras_calculation_logs`).
- Penetapan aturan validasi domain ARAS (total bobot = `1.0`, nilai kriteria `cost > 0`, hanya pendaftar `verified`, penanganan tie ranking).

## 2. Implementasi Bertahap (5 Sprint)
- **Sprint 1 — Backend Core**: setup FastAPI, koneksi SQLAlchemy/PyMySQL, seluruh model ORM & migrasi Alembic, mesin kalkulasi murni `ArasEngine` berbasis NumPy beserta unit test manual & edge cases.
- **Sprint 2 — Autentikasi JWT & Frontend Base**: hashing password `bcrypt`, JWT Bearer auth, RBAC dependency, frontend React + Vite + Tailwind + Headless UI, halaman Login/Register, route guard per peran, layout responsif, dan CRUD manajemen user.
- **Sprint 3 — Operasional Seleksi**: CRUD periode dan kriteria (dengan indikator validasi bobot), formulir pendaftaran mahasiswa (biodata, nilai kriteria, unggah berkas), serta tabel verifikasi dan preview berkas oleh panitia.
- **Sprint 4 — Kalkulasi ARAS Interaktif & Pelaporan**: endpoint kalkulasi dan log snapshot JSON, halaman step-by-step breakdown 6 tahap ARAS (tab interaktif), grafik perbandingan $K_i$ dengan Recharts, ekspor SK PDF (`jsPDF` + `jspdf-autotable`) dan Excel (`xlsx`), serta pengumuman kelulusan mahasiswa setelah periode selesai.
- **Sprint 5 — Pengujian Akhir, Seed Data & Dokumentasi**: script seed idempoten (admin, panitia, 15 pendaftar verified + contoh pending/rejected, 5 kriteria, 1 periode), pengujian API end-to-end, koleksi Postman, ERD, dokumentasi alur ARAS, dan README.

## 3. Pengujian (Verification & Testing)
- **Unit Test Algoritma**: verifikasi `ArasEngine` terhadap perhitungan manual Excel dengan toleransi $\le 0.0001$ serta pengujian kasus tepi (bobot invalid, nilai cost nol, matriks kosong/negatif, non-verified, dan tie ranking).
- **Integration & RBAC API Test**: pengujian seluruh endpoint REST API menggunakan `pytest` dan FastAPI `TestClient`.
- **Frontend Build Verification**: verifikasi kompilasi produksi Vite (`npm run build`).

