"""Mesin kalkulasi murni algoritma ARAS (Additive Ratio Assessment) berbasis NumPy."""

from typing import Any, Sequence

import numpy as np

from app.core.exceptions import ArasValidationError


class ArasEngine:
    """Implementasi murni algoritma ARAS (Additive Ratio Assessment) tanpa akses database.

    Langkah perhitungan yang dijalankan:
    1. Pembentukan solusi optimal A0 (benefit = max, cost = min) pada baris indeks 0.
    2. Normalisasi matriks keputusan yang diperluas (A0 ikut dijumlahkan).
    3. Pembobotan matriks ternormalisasi (D = R * w).
    4. Perhitungan nilai fungsi optimalisasi (S_i dan S_0).
    5. Perhitungan derajat utilitas (K_i = S_i / S_0).
    6. Pemeringkatan berdasarkan K_i menurun (penanganan tie dengan standard competition ranking).
    7. Penentuan kelulusan berdasarkan perbandingan ranking <= kuota penerima.
    """

    WEIGHT_SUM_TOLERANCE: float = 1e-6
    TIE_TOLERANCE: float = 1e-9
    VALID_CRITERIA_TYPES: tuple[str, str] = ("benefit", "cost")

    @classmethod
    def calculate(
        cls,
        matrix_x: Sequence[Sequence[float]] | np.ndarray,
        weights: Sequence[float] | np.ndarray,
        criteria_types: Sequence[str],
        quota: int = 1,
        verification_statuses: Sequence[str] | None = None,
    ) -> dict[str, Any]:
        """Menjalankan seluruh tahapan perhitungan ARAS dan mengembalikan breakdown lengkap.

        Args:
            matrix_x: Matriks keputusan berukuran m x n (m alternatif, n kriteria).
            weights: Vektor bobot kriteria sepanjang n dengan total harus = 1.0 (± 1e-6).
            criteria_types: Daftar tipe kriteria ('benefit' atau 'cost') sepanjang n.
            quota: Jumlah kuota penerima beasiswa (bilangan bulat >= 1).
            verification_statuses: Opsional daftar status verifikasi setiap alternatif
                sepanjang m; bila diisi, seluruh elemen wajib bernilai 'verified'.

        Returns:
            Dictionary berisi seluruh matriks dan hasil tiap langkah ARAS siap serialisasi JSON.

        Raises:
            ArasValidationError: Jika input melanggar aturan validasi domain ARAS.
        """
        parsed_matrix = cls._parse_and_validate_matrix(matrix_x)
        m_alternatives, n_criteria = parsed_matrix.shape

        parsed_types = cls._validate_criteria_types(criteria_types, n_criteria)
        parsed_weights = cls._validate_weights(weights, n_criteria)
        cls._validate_quota(quota)
        cls._validate_verification_statuses(verification_statuses, m_alternatives)
        cls._validate_matrix_domain_rules(parsed_matrix, parsed_types)

        # Langkah 1: Tentukan baris solusi optimal A0 dan gabungkan sebagai baris ke-0
        optimal_a0 = np.empty(n_criteria, dtype=np.float64)
        for col_idx, c_type in enumerate(parsed_types):
            column = parsed_matrix[:, col_idx]
            optimal_a0[col_idx] = np.max(column) if c_type == "benefit" else np.min(column)

        extended_matrix = np.vstack([optimal_a0, parsed_matrix])

        # Langkah 2: Normalisasi matriks (A0 ikut dalam penjumlahan setiap kolom)
        normalized_r = np.zeros_like(extended_matrix, dtype=np.float64)
        for col_idx, c_type in enumerate(parsed_types):
            col_values = extended_matrix[:, col_idx]
            if c_type == "benefit":
                col_sum = float(np.sum(col_values))
                if col_sum > 0.0:
                    normalized_r[:, col_idx] = col_values / col_sum
                else:
                    normalized_r[:, col_idx] = 0.0
            else:
                # Untuk kriteria cost, transformasi ke nilai kebalikan 1/x_ij terlebih dahulu
                inverted = 1.0 / col_values
                inv_sum = float(np.sum(inverted))
                normalized_r[:, col_idx] = inverted / inv_sum

        # Langkah 3: Hitung matriks ternormalisasi terbobot D = R * w
        weighted_d = normalized_r * parsed_weights

        # Langkah 4: Hitung fungsi optimalisasi S_i = sum_j(d_ij) termasuk S_0
        si_with_a0 = np.sum(weighted_d, axis=1)
        s0 = float(si_with_a0[0])
        if s0 <= 0.0:
            raise ArasValidationError(
                "Nilai optimalisasi S0 bernilai nol sehingga derajat utilitas Ki tidak dapat dihitung."
            )

        # Langkah 5: Hitung derajat utilitas K_i = S_i / S_0
        ki_with_a0 = si_with_a0 / s0
        ki_alternatives = ki_with_a0[1:]

        # Langkah 6: Pemeringkatan descending per alternatif (standard competition ranking untuk tie)
        rankings = cls._compute_rankings(ki_alternatives)

        # Langkah 7: Penentuan kelulusan berdasarkan kuota penerima
        eligibility_statuses = [
            "lolos" if rank <= quota else "tidak_lolos"
            for rank in rankings
        ]

        return {
            "optimal_row_a0": [float(val) for val in optimal_a0.tolist()],
            "extended_matrix": [[float(cell) for cell in row] for row in extended_matrix.tolist()],
            "normalized_matrix_r": [[float(cell) for cell in row] for row in normalized_r.tolist()],
            "weighted_matrix_d": [[float(cell) for cell in row] for row in weighted_d.tolist()],
            "s0": s0,
            "si_values": [float(val) for val in si_with_a0[1:].tolist()],
            "si_with_a0": [float(val) for val in si_with_a0.tolist()],
            "ki_values": [float(val) for val in ki_alternatives.tolist()],
            "ki_with_a0": [float(val) for val in ki_with_a0.tolist()],
            "rankings": rankings,
            "eligibility_statuses": eligibility_statuses,
            "quota": int(quota),
            "criteria_types": parsed_types,
            "weights": [float(w) for w in parsed_weights.tolist()],
        }

    @classmethod
    def _parse_and_validate_matrix(
        cls,
        matrix_x: Sequence[Sequence[float]] | np.ndarray,
    ) -> np.ndarray:
        """Memvalidasi struktur 2D, kelengkapan nilai, dan tipe numerik matriks keputusan."""
        if matrix_x is None:
            raise ArasValidationError("Matriks keputusan tidak boleh kosong.")

        if isinstance(matrix_x, np.ndarray):
            if matrix_x.ndim != 2:
                raise ArasValidationError("Matriks keputusan harus berbentuk array 2 dimensi (m x n).")
            rows_list = matrix_x.tolist()
        else:
            rows_list = list(matrix_x)

        if len(rows_list) == 0:
            raise ArasValidationError("Minimal harus terdapat 1 alternatif untuk dihitung.")

        row_lengths = set()
        numeric_rows: list[list[float]] = []

        for row_idx, row in enumerate(rows_list):
            if row is None or isinstance(row, (str, bytes)):
                raise ArasValidationError(f"Baris alternatif ke-{row_idx + 1} tidak valid.")
            row_items = list(row)
            if len(row_items) == 0:
                raise ArasValidationError("Minimal harus terdapat 1 kriteria untuk dihitung.")
            row_lengths.add(len(row_items))

            converted_row: list[float] = []
            for col_idx, cell in enumerate(row_items):
                if cell is None or isinstance(cell, bool):
                    raise ArasValidationError(
                        f"Nilai pada baris ke-{row_idx + 1}, kolom ke-{col_idx + 1} tidak boleh kosong."
                    )
                try:
                    val = float(cell)
                except (TypeError, ValueError) as exc:
                    raise ArasValidationError(
                        f"Nilai pada baris ke-{row_idx + 1}, kolom ke-{col_idx + 1} harus berupa angka."
                    ) from exc

                if np.isnan(val) or np.isinf(val):
                    raise ArasValidationError(
                        f"Nilai pada baris ke-{row_idx + 1}, kolom ke-{col_idx + 1} tidak valid (NaN/Inf)."
                    )
                converted_row.append(val)
            numeric_rows.append(converted_row)

        if len(row_lengths) != 1:
            raise ArasValidationError(
                "Setiap baris alternatif harus memiliki jumlah kolom kriteria yang sama."
            )

        return np.array(numeric_rows, dtype=np.float64)

    @classmethod
    def _validate_criteria_types(
        cls,
        criteria_types: Sequence[str],
        n_criteria: int,
    ) -> list[str]:
        """Memvalidasi daftar tipe kriteria ('benefit' atau 'cost') sesuai jumlah kolom."""
        if criteria_types is None or isinstance(criteria_types, (str, bytes)):
            raise ArasValidationError("Daftar tipe kriteria tidak valid.")

        types_list = [str(item).strip().lower() for item in criteria_types]
        if len(types_list) != n_criteria:
            raise ArasValidationError(
                f"Jumlah tipe kriteria ({len(types_list)}) harus sama dengan jumlah kolom matriks ({n_criteria})."
            )

        for idx, c_type in enumerate(types_list):
            if c_type not in cls.VALID_CRITERIA_TYPES:
                raise ArasValidationError(
                    f"Tipe kriteria ke-{idx + 1} ('{c_type}') tidak valid. Gunakan 'benefit' atau 'cost'."
                )
        return types_list

    @classmethod
    def _validate_weights(
        cls,
        weights: Sequence[float] | np.ndarray,
        n_criteria: int,
    ) -> np.ndarray:
        """Memvalidasi panjang vektor bobot, non-negatif, dan total bobot == 1.0 (± 1e-6)."""
        if weights is None or isinstance(weights, (str, bytes)):
            raise ArasValidationError("Daftar bobot kriteria tidak boleh kosong.")

        raw_weights = weights.tolist() if isinstance(weights, np.ndarray) else list(weights)
        if len(raw_weights) != n_criteria:
            raise ArasValidationError(
                f"Jumlah bobot ({len(raw_weights)}) harus sama dengan jumlah kriteria ({n_criteria})."
            )

        parsed: list[float] = []
        for idx, w in enumerate(raw_weights):
            if w is None or isinstance(w, bool):
                raise ArasValidationError(f"Bobot kriteria ke-{idx + 1} tidak boleh kosong.")
            try:
                val = float(w)
            except (TypeError, ValueError) as exc:
                raise ArasValidationError(
                    f"Bobot kriteria ke-{idx + 1} harus berupa angka."
                ) from exc

            if np.isnan(val) or np.isinf(val):
                raise ArasValidationError(f"Bobot kriteria ke-{idx + 1} tidak valid (NaN/Inf).")
            if val < 0.0:
                raise ArasValidationError(f"Bobot kriteria ke-{idx + 1} tidak boleh negatif.")
            parsed.append(val)

        weight_arr = np.array(parsed, dtype=np.float64)
        total_weight = float(np.sum(weight_arr))
        if abs(total_weight - 1.0) > cls.WEIGHT_SUM_TOLERANCE:
            raise ArasValidationError(
                f"Total bobot kriteria harus sama dengan 1.0 (saat ini: {total_weight:.6f})."
            )

        return weight_arr

    @classmethod
    def _validate_quota(cls, quota: int) -> None:
        """Memvalidasi kuota penerima harus bilangan bulat positif (>= 1)."""
        if isinstance(quota, bool) or not isinstance(quota, int) or quota < 1:
            raise ArasValidationError("Kuota penerima beasiswa harus bilangan bulat minimal 1.")

    @classmethod
    def _validate_verification_statuses(
        cls,
        verification_statuses: Sequence[str] | None,
        m_alternatives: int,
    ) -> None:
        """Memastikan seluruh pendaftar yang masuk ke kalkulasi berstatus 'verified'."""
        if verification_statuses is None:
            return

        status_list = [str(s).strip().lower() for s in verification_statuses]
        if len(status_list) != m_alternatives:
            raise ArasValidationError(
                "Jumlah status verifikasi tidak sesuai dengan jumlah alternatif pada matriks."
            )

        invalid_indices = [
            idx + 1 for idx, status_val in enumerate(status_list) if status_val != "verified"
        ]
        if invalid_indices:
            raise ArasValidationError(
                "Hanya pendaftar berstatus 'verified' yang boleh dihitung "
                f"(ditemukan status non-verified pada baris alternatif: {invalid_indices})."
            )

    @classmethod
    def _validate_matrix_domain_rules(
        cls,
        matrix: np.ndarray,
        criteria_types: list[str],
    ) -> None:
        """Memvalidasi nilai non-negatif serta nilai > 0 untuk seluruh kriteria bertipe cost."""
        if np.any(matrix < 0.0):
            raise ArasValidationError(
                "Nilai matriks keputusan tidak boleh bernilai negatif."
            )

        for col_idx, c_type in enumerate(criteria_types):
            if c_type == "cost" and np.any(matrix[:, col_idx] <= 0.0):
                raise ArasValidationError(
                    f"Nilai kriteria bertipe 'cost' pada kolom ke-{col_idx + 1} harus lebih besar dari 0."
                )

    @classmethod
    def _compute_rankings(cls, ki_values: np.ndarray) -> list[int]:
        """Menghitung ranking per alternatif (rank 1 = Ki tertinggi) dengan standard competition ranking."""
        num_alternatives = len(ki_values)
        sorted_indices = np.argsort(-ki_values, kind="stable")

        rankings = [0] * num_alternatives
        current_rank = 1
        prev_ki: float | None = None

        for pos, alt_idx in enumerate(sorted_indices):
            alt_ki = float(ki_values[alt_idx])
            if prev_ki is not None and abs(alt_ki - prev_ki) > cls.TIE_TOLERANCE:
                current_rank = pos + 1
            rankings[int(alt_idx)] = current_rank
            prev_ki = alt_ki

        return rankings

