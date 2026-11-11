"""Unit test untuk ArasEngine (Additive Ratio Assessment).

PERHITUNGAN MANUAL DATASET REFERENSI (Verifikasi Excel, toleransi <= 0.0001):
=============================================================================
Diketahui 3 alternatif (A1, A2, A3), 3 kriteria (C1, C2, C3), dan kuota = 2:
- C1: IPK (benefit), bobot w1 = 0.50
- C2: Penghasilan Orang Tua dalam juta (cost), bobot w2 = 0.30
- C3: Prestasi (benefit), bobot w3 = 0.20
Total bobot = 0.50 + 0.30 + 0.20 = 1.00

Matriks Keputusan Awal X (3 x 3):
- A1: [3.80, 2.00, 4.00]
- A2: [3.50, 1.00, 5.00]
- A3: [3.90, 4.00, 1.00]

Langkah 1 - Baris Solusi Optimal A0:
- C1 (benefit): max(3.80, 3.50, 3.90) = 3.90
- C2 (cost)   : min(2.00, 1.00, 4.00) = 1.00
- C3 (benefit): max(4.00, 5.00, 1.00) = 5.00
=> A0 = [3.90, 1.00, 5.00]

Langkah 2 - Normalisasi R (A0 ikut dijumlahkan pada setiap kolom):
- Kolom C1 (benefit): sum = 3.90 + 3.80 + 3.50 + 3.90 = 15.10
  r01 = 3.90 / 15.10 = 0.25827815
  r11 = 3.80 / 15.10 = 0.25165563
  r21 = 3.50 / 15.10 = 0.23178808
  r31 = 3.90 / 15.10 = 0.25827815
- Kolom C2 (cost): transformasi x'_ij = 1 / x_ij => [1.0, 0.5, 1.0, 0.25], sum = 2.75
  r02 = 1.00 / 2.75 = 0.36363636
  r12 = 0.50 / 2.75 = 0.18181818
  r22 = 1.00 / 2.75 = 0.36363636
  r32 = 0.25 / 2.75 = 0.09090909
- Kolom C3 (benefit): sum = 5.00 + 4.00 + 5.00 + 1.00 = 15.00
  r03 = 5.00 / 15.00 = 0.33333333
  r13 = 4.00 / 15.00 = 0.26666667
  r23 = 5.00 / 15.00 = 0.33333333
  r33 = 1.00 / 15.00 = 0.06666667

Langkah 3 - Matriks Terbobot D (d_ij = r_ij * w_j):
- A0: [0.12913907, 0.10909091, 0.06666667]
- A1: [0.12582781, 0.05454545, 0.05333333]
- A2: [0.11589404, 0.10909091, 0.06666667]
- A3: [0.12913907, 0.02727273, 0.01333333]

Langkah 4 - Fungsi Optimalisasi S_i = sum_j(d_ij):
- S0 = 0.30489665
- S1 = 0.23370660
- S2 = 0.29165162
- S3 = 0.16974513

Langkah 5 - Derajat Utilitas K_i = S_i / S_0:
- K0 = 1.00000000
- K1 = 0.23370660 / 0.30489665 = 0.76651089
- K2 = 0.29165162 / 0.30489665 = 0.95655894
- K3 = 0.16974513 / 0.30489665 = 0.55673007

Langkah 6 & 7 - Ranking dan Kelulusan (kuota = 2):
- A2: K2 = 0.95655894 -> Ranking 1 -> lolos
- A1: K1 = 0.76651089 -> Ranking 2 -> lolos
- A3: K3 = 0.55673007 -> Ranking 3 -> tidak_lolos
"""

import numpy as np
import pytest

from app.core.exceptions import ArasValidationError
from app.services.aras_engine import ArasEngine


TOLERANCE = 0.0001


def test_aras_manual_calculation_matches_reference() -> None:
    """Memastikan seluruh langkah kalkulasi ARAS cocok dengan hitungan manual Excel."""
    matrix_x = [
        [3.80, 2.00, 4.00],  # A1
        [3.50, 1.00, 5.00],  # A2
        [3.90, 4.00, 1.00],  # A3
    ]
    weights = [0.50, 0.30, 0.20]
    criteria_types = ["benefit", "cost", "benefit"]

    result = ArasEngine.calculate(
        matrix_x=matrix_x,
        weights=weights,
        criteria_types=criteria_types,
        quota=2,
    )

    # Langkah 1: A0 & extended matrix
    assert result["optimal_row_a0"] == pytest.approx([3.90, 1.00, 5.00], abs=TOLERANCE)
    assert len(result["extended_matrix"]) == 4
    assert result["extended_matrix"][0] == pytest.approx([3.90, 1.00, 5.00], abs=TOLERANCE)

    # Langkah 2: Matriks Normalisasi R
    expected_r = [
        [0.25827815, 0.36363636, 0.33333333],  # A0
        [0.25165563, 0.18181818, 0.26666667],  # A1
        [0.23178808, 0.36363636, 0.33333333],  # A2
        [0.25827815, 0.09090909, 0.06666667],  # A3
    ]
    np.testing.assert_allclose(result["normalized_matrix_r"], expected_r, atol=TOLERANCE)

    # Langkah 3: Matriks Terbobot D
    expected_d = [
        [0.12913907, 0.10909091, 0.06666667],  # A0
        [0.12582781, 0.05454545, 0.05333333],  # A1
        [0.11589404, 0.10909091, 0.06666667],  # A2
        [0.12913907, 0.02727273, 0.01333333],  # A3
    ]
    np.testing.assert_allclose(result["weighted_matrix_d"], expected_d, atol=TOLERANCE)

    # Langkah 4: Nilai S0 dan Si
    assert result["s0"] == pytest.approx(0.30489665, abs=TOLERANCE)
    assert result["si_values"] == pytest.approx(
        [0.23370660, 0.29165162, 0.16974513], abs=TOLERANCE
    )

    # Langkah 5: Nilai Ki
    assert result["ki_with_a0"][0] == pytest.approx(1.0, abs=TOLERANCE)
    assert result["ki_values"] == pytest.approx(
        [0.76651089, 0.95655894, 0.55673007], abs=TOLERANCE
    )

    # Langkah 6 & 7: Ranking & Status Kelulusan
    assert result["rankings"] == [2, 1, 3]
    assert result["eligibility_statuses"] == ["lolos", "lolos", "tidak_lolos"]


def test_aras_ranking_not_affected_by_argsort_permutation_bug() -> None:
    """Memastikan setiap alternatif mendapat nomor ranking miliknya sendiri (bukan hasil argsort)."""
    # K1 < K3 < K2 (urutan K_i: A1 terendah, A3 menengah, A2 tertinggi)
    # argsort(-K) adalah [1, 2, 0] (+1 -> [2, 3, 1]), sedangkan ranking sebenarnya [3, 1, 2]
    matrix_x = [
        [1.0],  # A1 -> terendah -> rank 3
        [3.0],  # A2 -> tertinggi -> rank 1
        [2.0],  # A3 -> menengah -> rank 2
    ]
    result = ArasEngine.calculate(
        matrix_x=matrix_x,
        weights=[1.0],
        criteria_types=["benefit"],
        quota=1,
    )

    assert result["rankings"] == [3, 1, 2]
    assert result["eligibility_statuses"] == ["tidak_lolos", "lolos", "tidak_lolos"]


def test_aras_tie_ranking_handled_consistently() -> None:
    """Nilai Ki yang sama harus memperoleh ranking identik (standard competition ranking)."""
    matrix_x = [
        [3.50, 2.00],  # A1
        [3.90, 1.00],  # A2 (tertinggi - tie dengan A3)
        [3.90, 1.00],  # A3 (tertinggi - tie dengan A2)
        [3.20, 3.00],  # A4 (terendah)
    ]
    result = ArasEngine.calculate(
        matrix_x=matrix_x,
        weights=[0.6, 0.4],
        criteria_types=["benefit", "cost"],
        quota=2,
    )

    # A2 dan A3 sama-sama rank 1; A1 melompat ke rank 3; A4 rank 4
    assert result["rankings"] == [3, 1, 1, 4]
    assert result["eligibility_statuses"] == [
        "tidak_lolos",
        "lolos",
        "lolos",
        "tidak_lolos",
    ]


def test_aras_rejects_weights_not_summing_to_one() -> None:
    """Total bobot != 1.0 di luar toleransi 1e-6 harus ditolak."""
    with pytest.raises(ArasValidationError, match="Total bobot"):
        ArasEngine.calculate(
            matrix_x=[[3.5, 2.0], [3.8, 1.5]],
            weights=[0.5, 0.4],
            criteria_types=["benefit", "cost"],
            quota=1,
        )

    with pytest.raises(ArasValidationError, match="Total bobot"):
        ArasEngine.calculate(
            matrix_x=[[3.5, 2.0], [3.8, 1.5]],
            weights=[0.6, 0.5],
            criteria_types=["benefit", "cost"],
            quota=1,
        )


def test_aras_accepts_weights_within_tolerance() -> None:
    """Total bobot dengan galat pembulatan kecil <= 1e-6 tetap diterima."""
    result = ArasEngine.calculate(
        matrix_x=[[3.5, 2.0], [3.8, 1.5]],
        weights=[0.333333, 0.666667],
        criteria_types=["benefit", "cost"],
        quota=1,
    )
    assert len(result["rankings"]) == 2


def test_aras_rejects_zero_or_negative_cost_values() -> None:
    """Nilai kriteria cost <= 0 harus ditolak untuk menghindari pembagian nol."""
    with pytest.raises(ArasValidationError, match="cost"):
        ArasEngine.calculate(
            matrix_x=[[3.5, 0.0], [3.8, 2.0]],
            weights=[0.5, 0.5],
            criteria_types=["benefit", "cost"],
            quota=1,
        )


def test_aras_rejects_negative_benefit_and_negative_weights() -> None:
    """Nilai matriks negatif maupun bobot negatif harus ditolak."""
    with pytest.raises(ArasValidationError, match="negatif"):
        ArasEngine.calculate(
            matrix_x=[[-1.0, 2.0], [3.8, 1.0]],
            weights=[0.5, 0.5],
            criteria_types=["benefit", "cost"],
            quota=1,
        )

    with pytest.raises(ArasValidationError, match="negatif"):
        ArasEngine.calculate(
            matrix_x=[[3.5, 2.0], [3.8, 1.0]],
            weights=[-0.2, 1.2],
            criteria_types=["benefit", "cost"],
            quota=1,
        )


def test_aras_rejects_empty_or_missing_or_invalid_inputs() -> None:
    """Input kosong, ragged, None, NaN, Inf, atau kriteria tidak valid harus ditolak."""
    with pytest.raises(ArasValidationError):
        ArasEngine.calculate([], [1.0], ["benefit"], quota=1)

    with pytest.raises(ArasValidationError):
        ArasEngine.calculate([[]], [], [], quota=1)

    with pytest.raises(ArasValidationError):
        ArasEngine.calculate([[3.5, None]], [0.5, 0.5], ["benefit", "cost"], quota=1)

    with pytest.raises(ArasValidationError):
        ArasEngine.calculate([[3.5, float("nan")]], [0.5, 0.5], ["benefit", "cost"], quota=1)

    with pytest.raises(ArasValidationError):
        ArasEngine.calculate([[3.5, float("inf")]], [0.5, 0.5], ["benefit", "cost"], quota=1)

    with pytest.raises(ArasValidationError):
        ArasEngine.calculate([[3.5, 2.0], [3.8]], [0.5, 0.5], ["benefit", "cost"], quota=1)

    with pytest.raises(ArasValidationError):
        ArasEngine.calculate([[3.5, 2.0]], [0.5, 0.5], ["benefit", "unknown"], quota=1)


def test_aras_rejects_unverified_applicants_when_statuses_provided() -> None:
    """Hanya pendaftar berstatus 'verified' yang boleh ikut dihitung."""
    with pytest.raises(ArasValidationError, match="verified"):
        ArasEngine.calculate(
            matrix_x=[[3.8, 2.0], [3.6, 1.5]],
            weights=[0.6, 0.4],
            criteria_types=["benefit", "cost"],
            quota=1,
            verification_statuses=["verified", "pending"],
        )

    result = ArasEngine.calculate(
        matrix_x=[[3.8, 2.0], [3.6, 1.5]],
        weights=[0.6, 0.4],
        criteria_types=["benefit", "cost"],
        quota=1,
        verification_statuses=["verified", "verified"],
    )
    assert len(result["rankings"]) == 2


def test_aras_handles_zero_benefit_column_and_rejects_all_zero_matrix() -> None:
    """Kolom benefit bernilai nol semua aman dari NaN, sedangkan S0=0 ditolak."""
    result = ArasEngine.calculate(
        matrix_x=[[3.8, 0.0], [3.5, 0.0]],
        weights=[0.7, 0.3],
        criteria_types=["benefit", "benefit"],
        quota=5,  # Kuota melebihi jumlah alternatif -> semua lolos
    )
    assert result["ki_values"][0] > result["ki_values"][1]
    assert result["eligibility_statuses"] == ["lolos", "lolos"]

    with pytest.raises(ArasValidationError, match="S0"):
        ArasEngine.calculate(
            matrix_x=[[0.0, 0.0], [0.0, 0.0]],
            weights=[0.5, 0.5],
            criteria_types=["benefit", "benefit"],
            quota=1,
        )


def test_aras_rejects_invalid_quota() -> None:
    """Kuota <= 0 atau bertipe boolean harus ditolak."""
    with pytest.raises(ArasValidationError, match="Kuota"):
        ArasEngine.calculate([[3.5]], [1.0], ["benefit"], quota=0)

    with pytest.raises(ArasValidationError, match="Kuota"):
        ArasEngine.calculate([[3.5]], [1.0], ["benefit"], quota=True)

