# Verifikasi Perhitungan Manual ARAS (Acuan Microsoft Excel & Unit Test)

Dokumen ini berisi perhitungan manual lengkap menggunakan dataset uji pada `backend/tests/test_aras_engine.py` sehingga dapat diverifikasi langsung menggunakan Microsoft Excel (toleransi $\le 0.0001$).

---

## Data Masukan

- **Kuota Penerima**: `2`
- **Kriteria**:
  - `C1` (IPK) — Tipe: `benefit`, Bobot $w_1 = 0.50$
  - `C2` (Penghasilan Orang Tua dalam juta) — Tipe: `cost`, Bobot $w_2 = 0.30$
  - `C3` (Prestasi) — Tipe: `benefit`, Bobot $w_3 = 0.20$
  - Total bobot: $0.50 + 0.30 + 0.20 = 1.00$

| Alternatif | C1 (Benefit) | C2 (Cost) | C3 (Benefit) |
| :--- | :---: | :---: | :---: |
| **A1** | 3.80 | 2.00 | 4.00 |
| **A2** | 3.50 | 1.00 | 5.00 |
| **A3** | 3.90 | 4.00 | 1.00 |

---

## Langkah 1 — Baris Solusi Optimal ($A_0$)

- `C1` (benefit): `=MAX(B2:B4)` = $\max(3.80, 3.50, 3.90) = \mathbf{3.90}$
- `C2` (cost): `=MIN(C2:C4)` = $\min(2.00, 1.00, 4.00) = \mathbf{1.00}$
- `C3` (benefit): `=MAX(D2:D4)` = $\max(4.00, 5.00, 1.00) = \mathbf{5.00}$

Matriks Diperluas $(m+1) \times n$:

| Baris | C1 | C2 | C3 |
| :--- | :---: | :---: | :---: |
| **A0** | **3.90** | **1.00** | **5.00** |
| **A1** | 3.80 | 2.00 | 4.00 |
| **A2** | 3.50 | 1.00 | 5.00 |
| **A3** | 3.90 | 4.00 | 1.00 |

---

## Langkah 2 — Normalisasi Matriks ($R$)

### Kolom C1 (Benefit)
Jumlah kolom ($A_0$ ikut dijumlahkan): $3.90 + 3.80 + 3.50 + 3.90 = 15.10$
- $r_{01} = 3.90 / 15.10 = 0.25827815$
- $r_{11} = 3.80 / 15.10 = 0.25165563$
- $r_{21} = 3.50 / 15.10 = 0.23178808$
- $r_{31} = 3.90 / 15.10 = 0.25827815$

### Kolom C2 (Cost)
Transformasi kebalikan $x'_{i2} = 1 / x_{i2}$:
- $x'_{02} = 1 / 1.00 = 1.00$
- $x'_{12} = 1 / 2.00 = 0.50$
- $x'_{22} = 1 / 1.00 = 1.00$
- $x'_{32} = 1 / 4.00 = 0.25$
- Jumlah kebalikan: $1.00 + 0.50 + 1.00 + 0.25 = 2.75$

Normalisasi $r_{i2} = x'_{i2} / 2.75$:
- $r_{02} = 1.00 / 2.75 = 0.36363636$
- $r_{12} = 0.50 / 2.75 = 0.18181818$
- $r_{22} = 1.00 / 2.75 = 0.36363636$
- $r_{32} = 0.25 / 2.75 = 0.09090909$

### Kolom C3 (Benefit)
Jumlah kolom ($A_0$ ikut dijumlahkan): $5.00 + 4.00 + 5.00 + 1.00 = 15.00$
- $r_{03} = 5.00 / 15.00 = 0.33333333$
- $r_{13} = 4.00 / 15.00 = 0.26666667$
- $r_{23} = 5.00 / 15.00 = 0.33333333$
- $r_{33} = 1.00 / 15.00 = 0.06666667$

---

## Langkah 3 — Matriks Terbobot ($D = R \times w$)

Dengan $w = [0.50,\ 0.30,\ 0.20]$:

| Baris | d_i1 (w=0.50) | d_i2 (w=0.30) | d_i3 (w=0.20) |
| :--- | :---: | :---: | :---: |
| **A0** | 0.12913907 | 0.10909091 | 0.06666667 |
| **A1** | 0.12582781 | 0.05454545 | 0.05333333 |
| **A2** | 0.11589404 | 0.10909091 | 0.06666667 |
| **A3** | 0.12913907 | 0.02727273 | 0.01333333 |

---

## Langkah 4 & 5 — Fungsi Optimalisasi ($S_i$) & Derajat Utilitas ($K_i$)

- $S_0 = 0.12913907 + 0.10909091 + 0.06666667 = \mathbf{0.30489665}$
- $S_1 = 0.12582781 + 0.05454545 + 0.05333333 = \mathbf{0.23370660}$
- $S_2 = 0.11589404 + 0.10909091 + 0.06666667 = \mathbf{0.29165162}$
- $S_3 = 0.12913907 + 0.02727273 + 0.01333333 = \mathbf{0.16974513}$

Nilai $K_i = S_i / S_0$:
- $K_0 = 0.30489665 / 0.30489665 = \mathbf{1.00000000}$
- $K_1 = 0.23370660 / 0.30489665 = \mathbf{0.76651089}$
- $K_2 = 0.29165162 / 0.30489665 = \mathbf{0.95655894}$
- $K_3 = 0.16974513 / 0.30489665 = \mathbf{0.55673007}$

---

## Langkah 6 & 7 — Peringkat & Status Kelulusan (Kuota = 2)

| Alternatif | Nilai $S_i$ | Nilai $K_i$ | Ranking | Status Kelulusan |
| :---: | :---: | :---: | :---: | :---: |
| **A2** | 0.29165162 | **0.95655894** | **1** | **Lolos** |
| **A1** | 0.23370660 | **0.76651089** | **2** | **Lolos** |
| **A3** | 0.16974513 | **0.55673007** | **3** | **Tidak Lolos** |

Hasil di atas diuji secara otomatis pada fungsi `test_aras_manual_calculation_matches_reference` di `backend/tests/test_aras_engine.py`.

