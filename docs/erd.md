# Entity Relationship Diagram (ERD) — BeasiswaSmart (BeSmart)

Diagram relasi antar 7 tabel utama pada database MySQL 8.0+ BeSmart:

```mermaid
erDiagram
    users {
        INT id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password_hash
        ENUM role "admin | panitia | mahasiswa"
        DATETIME created_at
        DATETIME updated_at
    }

    scholarship_periods {
        INT id PK
        VARCHAR nama_periode
        INT kuota_penerima "CHECK > 0"
        ENUM status "buka | proses | selesai"
        BOOLEAN is_active
        DATETIME created_at
        DATETIME updated_at
    }

    criteria {
        INT id PK
        VARCHAR kode_kriteria UK "C1, C2, ..."
        VARCHAR nama_kriteria
        ENUM tipe "benefit | cost"
        DECIMAL bobot "DECIMAL(6,4)"
        TEXT keterangan
        DATETIME created_at
        DATETIME updated_at
    }

    applicants {
        INT id PK
        INT period_id FK
        INT user_id FK
        VARCHAR nim
        VARCHAR nama_lengkap
        VARCHAR program_studi
        VARCHAR berkas_path "nullable"
        ENUM status_verifikasi "pending | verified | rejected"
        DATETIME created_at
        DATETIME updated_at
    }

    applicant_scores {
        INT id PK
        INT applicant_id FK
        INT criterion_id FK
        DECIMAL nilai_input "DECIMAL(15,4)"
        DATETIME created_at
        DATETIME updated_at
    }

    aras_results {
        INT id PK
        INT period_id FK
        INT applicant_id FK
        DECIMAL nilai_si "DECIMAL(12,8)"
        DECIMAL nilai_ki "DECIMAL(12,8)"
        INT ranking
        ENUM status_lolos "lolos | tidak_lolos"
        DATETIME calculated_at
        DATETIME created_at
        DATETIME updated_at
    }

    aras_calculation_logs {
        INT id PK
        INT period_id FK
        JSON snapshot "A0, X, R, D, Si, S0, Ki, ranking"
        DATETIME created_at
        DATETIME updated_at
    }

    users ||--o{ applicants : "mendaftar"
    scholarship_periods ||--o{ applicants : "membuka"
    applicants ||--o{ applicant_scores : "memiliki_nilai"
    criteria ||--o{ applicant_scores : "dinilai_pada"
    scholarship_periods ||--o{ aras_results : "menghasilkan"
    applicants ||--o| aras_results : "mendapat_peringkat"
    scholarship_periods ||--o{ aras_calculation_logs : "mencatat_log"
```

## Catatan Constraint & Integritas Data

1. **Unique Constraints**:
   - `users(email)`
   - `criteria(kode_kriteria)`
   - `applicants(period_id, user_id)` — satu mahasiswa hanya dapat mendaftar 1 kali per periode.
   - `applicant_scores(applicant_id, criterion_id)` — satu pendaftar memiliki tepat 1 nilai per kriteria.
   - `aras_results(period_id, applicant_id)` — satu hasil peringkat akhir per pendaftar dalam satu periode.
2. **Foreign Keys (`ON DELETE CASCADE`)**: seluruh relasi anak mengikuti penghapusan parent secara konsisten agar tidak terjadi data yatim (*orphan records*).
3. **Check Constraints**: `kuota_penerima > 0` pada `scholarship_periods` dan `bobot >= 0 AND bobot <= 1` pada `criteria`.

