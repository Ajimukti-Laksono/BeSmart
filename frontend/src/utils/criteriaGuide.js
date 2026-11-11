export const ACHIEVEMENT_LEVELS = [
  { value: "kampus", label: "Tingkat Kampus", points: 20 },
  { value: "provinsi", label: "Tingkat Provinsi", points: 35 },
  { value: "nasional", label: "Tingkat Nasional", points: 60 },
  { value: "internasional", label: "Tingkat Internasional", points: 85 },
];

export const ACHIEVEMENT_LEVEL_MAP = Object.fromEntries(
  ACHIEVEMENT_LEVELS.map((lvl) => [lvl.value, lvl])
);

export function calculateAchievementScore(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { rawTotal: 0, finalScore: 0 };
  }
  const rawTotal = rows.reduce((sum, row) => {
    const lvl = ACHIEVEMENT_LEVEL_MAP[row.level];
    const count = Math.max(0, Math.floor(Number(row.count) || 0));
    return sum + (lvl ? lvl.points * count : 0);
  }, 0);
  return {
    rawTotal,
    finalScore: rawTotal,
  };
}

/**
 * Panduan terpusat kriteria penilaian BeSmart agar penamaan, penjelasan,
 * dan contoh konsisten antara form Mahasiswa, Manajemen Kriteria Admin, dan Matriks ARAS.
 */
export function getCriterionGuide(criterion) {
  const code = (criterion?.kode_kriteria || "").toUpperCase();
  const name = (criterion?.nama_kriteria || "").toLowerCase();

  if (code === "C1" || name.includes("ipk")) {
    return {
      key: "ipk",
      shortLabel: "IPK",
      displayTitle: "IPK (Indeks Prestasi Kumulatif)",
      shortDesc:
        "Nilai rata-rata prestasi akademik kumulatif sesuai transkrip nilai terakhir Anda (skala 0.00 – 4.00).",
      exampleText: "Contoh: 3.80 (untuk IPK 3,80) atau 3.65",
      placeholder: "Contoh: 3.80",
      sampleValue: "3.85",
      presets: null,
    };
  }

  if (code === "C2" || name.includes("penghasilan")) {
    return {
      key: "penghasilan",
      shortLabel: "Penghasilan Orang Tua",
      displayTitle: "Penghasilan Orang Tua (per Bulan)",
      shortDesc:
        "Total pendapatan gabungan ayah dan ibu per bulan dalam satuan Juta Rupiah (wajib > 0). Semakin kecil penghasilan, semakin diprioritaskan.",
      exampleText:
        "Contoh: Rp 2.500.000/bulan -> isi 2.5 | Rp 850.000/bulan -> isi 0.85 | Rp 4.000.000 -> isi 4",
      placeholder: "Contoh: 2.5 (untuk Rp 2,5 juta)",
      sampleValue: "2.5",
      presets: [
        { label: "Rp 1 Juta (1)", value: "1" },
        { label: "Rp 2,5 Juta (2.5)", value: "2.5" },
        { label: "Rp 4 Juta (4)", value: "4" },
      ],
    };
  }

  if (code === "C3" || name.includes("tanggungan")) {
    return {
      key: "tanggungan",
      shortLabel: "Jumlah Tanggungan",
      displayTitle: "Jumlah Tanggungan Keluarga",
      shortDesc:
        "Maksudnya adalah total anggota keluarga yang biaya hidup atau sekolahnya masih ditanggung oleh orang tua (termasuk Anda sendiri, adik/kakak yang masih sekolah/kuliah, atau anggota keluarga lain yang dibiayai).",
      exampleText:
        "Contoh: Anda + 2 adik masih sekolah = isi 3 | Hanya Anda seorang = isi 1",
      placeholder: "Contoh: 3",
      sampleValue: "3",
      presets: [
        { label: "1 Orang", value: "1" },
        { label: "2 Orang", value: "2" },
        { label: "3 Orang", value: "3" },
        { label: "4 Orang", value: "4" },
      ],
    };
  }

  if (code === "C4" || name.includes("prestasi")) {
    return {
      key: "prestasi",
      shortLabel: "Skor Prestasi",
      displayTitle: "Skor Prestasi (Prestasi yang Diraih)",
      shortDesc:
        "Pilih tingkat prestasi akademik/non-akademik yang pernah diraih lalu tentukan berapa kali diraih. Skor dihitung otomatis tanpa batas maksimal.",
      exampleText:
        "Poin per prestasi: Kampus = 20 | Provinsi = 35 | Nasional = 60 | Internasional = 85 (Contoh: 1× Nasional + 1× Kampus = 80)",
      placeholder: "Dihitung otomatis dari daftar prestasi",
      sampleValue: "80",
      presets: null,
    };
  }

  if (code === "C5" || name.includes("semester")) {
    return {
      key: "semester",
      shortLabel: "Semester Berjalan",
      displayTitle: "Semester Berjalan",
      shortDesc:
        "Angka semester aktif yang sedang Anda tempuh saat mendaftar beasiswa ini (umumnya semester 2 sampai 8).",
      exampleText: "Contoh: Sedang kuliah di semester 4 -> isi 4 | Semester 6 -> isi 6",
      placeholder: "Contoh: 6",
      sampleValue: "6",
      presets: [
        { label: "Sem 2", value: "2" },
        { label: "Sem 4", value: "4" },
        { label: "Sem 6", value: "6" },
        { label: "Sem 8", value: "8" },
      ],
    };
  }

  return {
    key: code.toLowerCase() || "custom",
    shortLabel: criterion?.nama_kriteria || code,
    displayTitle: criterion?.nama_kriteria || code,
    shortDesc:
      criterion?.keterangan ||
      (criterion?.tipe === "cost"
        ? "Kriteria bertipe Cost (semakin kecil nilai semakin baik, wajib > 0)."
        : "Kriteria bertipe Benefit (semakin besar nilai semakin baik, >= 0)."),
    exampleText:
      criterion?.tipe === "cost"
        ? "Contoh: masukkan angka positif lebih dari 0"
        : "Contoh: masukkan angka >= 0 sesuai ketentuan",
    placeholder: criterion?.tipe === "cost" ? "Wajib > 0" : "Masukkan nilai (>= 0)",
    sampleValue: criterion?.tipe === "cost" ? "1" : "80",
    presets: null,
  };
}

export function formatRupiahPreview(millionValue) {
  const num = Number(millionValue);
  if (Number.isNaN(num) || num <= 0) return null;
  const rupiah = Math.round(num * 1_000_000);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(rupiah);
}

