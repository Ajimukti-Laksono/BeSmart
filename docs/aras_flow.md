# Alur Algoritma ARAS (Additive Ratio Assessment)

Metode **ARAS** diperkenalkan oleh Zavadskas & Turskis (2010) untuk menentukan peringkat alternatif berdasarkan rasio tingkat utilitas masing-masing alternatif terhadap **solusi optimal ideal ($A_0$)**.

## Diagram Alur Sistem

```mermaid
flowchart TD
    A["Ambil Periode, Kriteria, dan Pendaftar Verified"] --> B{"Validasi Prasyarat:<br/>m >= 1, n >= 1, sum(bobot) = 1.0,<br/>semua nilai lengkap, cost > 0?"}
    B -- Tidak Valid --> ERR["Tolak dengan ArasValidationError (422)"]
    B -- Valid --> C["1. Tentukan Solusi Optimal A0<br/>Benefit: max(x_ij), Cost: min(x_ij)"]
    C --> D["Gabungkan A0 sebagai baris indeks 0 -> Matriks (m+1) x n"]
    D --> E["2. Normalisasi Matriks R (A0 ikut dijumlahkan)<br/>Benefit: r_ij = x_ij / sum(x_ij)<br/>Cost: x'_ij = 1/x_ij, r_ij = x'_ij / sum(x'_ij)"]
    E --> F["3. Matriks Terbobot D<br/>d_ij = r_ij * w_j"]
    F --> G["4. Fungsi Optimalisasi S_i = sum_j(d_ij)<br/>termasuk S_0 untuk baris A0"]
    G --> H["5. Derajat Utilitas K_i = S_i / S_0"]
    H --> I["6. Urutkan K_i Descending (Ranking 1 = K_i tertinggi)<br/>Tie K_i sama -> standard competition ranking"]
    I --> J["7. Status Kelulusan:<br/>ranking <= kuota_penerima -> lolos, selainnya tidak_lolos"]
    J --> K["Simpan ke aras_results & aras_calculation_logs"]
```

## Rumus Matematis Setiap Tahap

1. **Pembentukan Matriks Keputusan dengan $A_0$**:
   $$x_{0j} = \begin{cases} \max_i x_{ij}, & \text{jika kriteria } j \text{ bertipe benefit} \\ \min_i x_{ij}, & \text{jika kriteria } j \text{ bertipe cost} \end{cases}$$

2. **Normalisasi Matriks ($R$)**:
   - Kriteria **benefit**:
     $$r_{ij} = \frac{x_{ij}}{\sum_{i=0}^{m} x_{ij}}$$
   - Kriteria **cost**:
     $$x'_{ij} = \frac{1}{x_{ij}}, \qquad r_{ij} = \frac{x'_{ij}}{\sum_{i=0}^{m} x'_{ij}}$$

3. **Matriks Ternormalisasi Terbobot ($D$)**:
   $$d_{ij} = r_{ij} \cdot w_j, \qquad \text{dengan } \sum_{j=1}^{n} w_j = 1$$

4. **Fungsi Optimalisasi ($S_i$)**:
   $$S_i = \sum_{j=1}^{n} d_{ij}, \quad i = 0, 1, \dots, m$$

5. **Derajat Utilitas ($K_i$)**:
   $$K_i = \frac{S_i}{S_0}, \quad K_i \in [0, 1]$$

6. **Pemeringkatan & Kelulusan**:
   Semakin tinggi nilai $K_i$, semakin dekat alternatif tersebut dengan solusi optimal $A_0$. Alternatif dengan `ranking <= kuota_penerima` dinyatakan **lolos**.

