import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  createApplicantApi,
  getApplicantsApi,
  saveApplicantScoresApi,
  updateApplicantApi,
  uploadBerkasApi,
} from "../../api/applicants";
import { getCriteriaApi } from "../../api/criteria";
import { getPeriodsApi } from "../../api/periods";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  ACHIEVEMENT_LEVELS,
  ACHIEVEMENT_LEVEL_MAP,
  calculateAchievementScore,
  formatRupiahPreview,
  getCriterionGuide,
} from "../../utils/criteriaGuide";
import { getErrorMessage } from "../../utils/error";
import BerkasPreviewModal from "../../components/BerkasPreviewModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

export default function RegistrationPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [periods, setPeriods] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [myApplicants, setMyApplicants] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [loading, setLoading] = useState(true);

  const [nim, setNim] = useState("");
  const [namaLengkap, setNamaLengkap] = useState(user?.name || "");
  const [programStudi, setProgramStudi] = useState("");
  const [scoreValues, setScoreValues] = useState({});
  const [achievementRows, setAchievementRows] = useState([{ level: "kampus", count: 0 }]);
  const [achievementTouched, setAchievementTouched] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showGuideExample, setShowGuideExample] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [periodList, criteriaRes, applicantList] = await Promise.all([
        getPeriodsApi({ is_active: true }),
        getCriteriaApi(),
        getApplicantsApi(),
      ]);
      setPeriods(periodList);
      setCriteria(criteriaRes.items || []);
      setMyApplicants(applicantList);

      if (!selectedPeriodId && periodList.length > 0) {
        const openPeriod = periodList.find((p) => p.status === "buka") || periodList[0];
        setSelectedPeriodId(String(openPeriod.id));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat data pendaftaran."));
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentPeriod = useMemo(
    () => periods.find((p) => String(p.id) === String(selectedPeriodId)) || null,
    [periods, selectedPeriodId]
  );

  const existingApplicant = useMemo(
    () => myApplicants.find((a) => String(a.period_id) === String(selectedPeriodId)) || null,
    [myApplicants, selectedPeriodId]
  );

  const prestasiCriterion = useMemo(
    () => criteria.find((c) => getCriterionGuide(c).key === "prestasi") || null,
    [criteria]
  );

  useEffect(() => {
    if (existingApplicant) {
      setNim(existingApplicant.nim);
      setNamaLengkap(existingApplicant.nama_lengkap);
      setProgramStudi(existingApplicant.program_studi);
      const map = {};
      for (const s of existingApplicant.scores || []) {
        map[s.criterion_id] = String(s.nilai_input);
      }
      setScoreValues(map);
      setAchievementTouched(false);
      setAchievementRows([{ level: "kampus", count: 0 }]);
    } else {
      setNim("");
      setNamaLengkap(user?.name || "");
      setProgramStudi("");
      const initialMap = {};
      if (prestasiCriterion) {
        initialMap[prestasiCriterion.id] = "0";
      }
      setScoreValues(initialMap);
      setAchievementTouched(false);
      setAchievementRows([{ level: "kampus", count: 0 }]);
    }
    setSelectedFile(null);
  }, [existingApplicant, user, prestasiCriterion]);

  const achievementSummary = useMemo(
    () => calculateAchievementScore(achievementRows),
    [achievementRows]
  );

  const syncAchievementRows = useCallback(
    (nextRows) => {
      setAchievementRows(nextRows);
      setAchievementTouched(true);
      if (prestasiCriterion) {
        const { finalScore } = calculateAchievementScore(nextRows);
        setScoreValues((prev) => ({
          ...prev,
          [prestasiCriterion.id]: String(finalScore),
        }));
      }
    },
    [prestasiCriterion]
  );

  const handleAchievementRowChange = (rowIdx, field, value) => {
    const nextRows = achievementRows.map((row, idx) => {
      if (idx !== rowIdx) return row;
      if (field === "count") {
        const parsed = Math.max(0, Math.floor(Number(value) || 0));
        return { ...row, count: parsed };
      }
      return { ...row, [field]: value };
    });
    syncAchievementRows(nextRows);
  };

  const handleAddAchievementRow = () => {
    const usedLevels = new Set(achievementRows.map((r) => r.level));
    const nextLevel =
      ACHIEVEMENT_LEVELS.find((lvl) => !usedLevels.has(lvl.value))?.value ||
      ACHIEVEMENT_LEVELS[0].value;
    syncAchievementRows([...achievementRows, { level: nextLevel, count: 1 }]);
  };

  const handleRemoveAchievementRow = (rowIdx) => {
    if (achievementRows.length <= 1) {
      syncAchievementRows([{ level: "kampus", count: 0 }]);
      return;
    }
    syncAchievementRows(achievementRows.filter((_, idx) => idx !== rowIdx));
  };

  const handleResetZeroAchievement = () => {
    syncAchievementRows([{ level: "kampus", count: 0 }]);
  };

  const isLocked = useMemo(() => {
    if (!currentPeriod) return true;
    if (currentPeriod.status !== "buka") return true;
    if (existingApplicant?.status_verifikasi === "verified") return true;
    return false;
  }, [currentPeriod, existingApplicant]);

  const handleApplySampleExample = () => {
    if (isLocked) return;
    if (!nim.trim()) setNim("2301001");
    if (!namaLengkap.trim()) setNamaLengkap(user?.name || "Andi Pratama");
    if (!programStudi.trim()) setProgramStudi("Teknik Informatika");

    const nextScores = { ...scoreValues };
    for (const c of criteria) {
      const guide = getCriterionGuide(c);
      nextScores[c.id] = guide.sampleValue;
    }
    setScoreValues(nextScores);
    setAchievementRows([
      { level: "nasional", count: 1 },
      { level: "kampus", count: 1 },
    ]);
    setAchievementTouched(true);
    toast.info("Contoh nilai terisi. Silakan sesuaikan kembali dengan data asli Anda.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPeriod) {
      toast.error("Pilih periode beasiswa terlebih dahulu.");
      return;
    }
    if (nim.trim().length < 3 || namaLengkap.trim().length < 2 || programStudi.trim().length < 2) {
      toast.error("Lengkapi NIM, nama lengkap, dan program studi dengan benar.");
      return;
    }

    const parsedScores = [];
    for (const c of criteria) {
      const raw = scoreValues[c.id];
      if (raw === undefined || raw === "") {
        toast.error(`Nilai untuk kriteria ${c.kode_kriteria} (${c.nama_kriteria}) wajib diisi.`);
        return;
      }
      const val = Number(raw);
      if (Number.isNaN(val) || val < 0) {
        toast.error(`Nilai ${c.kode_kriteria} tidak boleh negatif.`);
        return;
      }
      if (c.tipe === "cost" && val <= 0) {
        toast.error(`Nilai kriteria cost ${c.kode_kriteria} (${c.nama_kriteria}) harus > 0.`);
        return;
      }
      parsedScores.push({ criterion_id: c.id, nilai_input: val });
    }

    setSubmitting(true);
    try {
      let applicantRecord = existingApplicant;
      if (!applicantRecord) {
        applicantRecord = await createApplicantApi({
          period_id: currentPeriod.id,
          nim: nim.trim(),
          nama_lengkap: namaLengkap.trim(),
          program_studi: programStudi.trim(),
          scores: parsedScores,
        });
      } else {
        applicantRecord = await updateApplicantApi(applicantRecord.id, {
          nim: nim.trim(),
          nama_lengkap: namaLengkap.trim(),
          program_studi: programStudi.trim(),
        });
        if (parsedScores.length > 0) {
          applicantRecord = await saveApplicantScoresApi(applicantRecord.id, parsedScores);
        }
      }

      if (selectedFile) {
        applicantRecord = await uploadBerkasApi(applicantRecord.id, selectedFile);
      }

      toast.success("Data pendaftaran, nilai kriteria, dan berkas berhasil disimpan.");
      setSelectedFile(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menyimpan pendaftaran beasiswa."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Memuat formulir pendaftaran..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Formulir Pendaftaran Beasiswa
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Lengkapi biodata, isi informasi kriteria sesuai keadaan sebenarnya, dan unggah berkas
          persyaratan.
        </p>
      </div>

      {periods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Belum ada periode beasiswa aktif saat ini.
          </p>
        </div>
      ) : (
        <>
          {/* Pilih Periode */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[240px] flex-1">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Periode Beasiswa
                </label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_periode} (Kuota: {p.kuota_penerima})
                    </option>
                  ))}
                </select>
              </div>

              {currentPeriod && (
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-slate-500">
                    <p>Status Periode</p>
                    <div className="mt-1">
                      <StatusBadge status={currentPeriod.status} />
                    </div>
                  </div>
                  {existingApplicant && (
                    <div className="text-right text-xs text-slate-500">
                      <p>Status Verifikasi</p>
                      <div className="mt-1">
                        <StatusBadge status={existingApplicant.status_verifikasi} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isLocked && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Lock className="h-4 w-4 shrink-0" />
                <span>
                  {existingApplicant?.status_verifikasi === "verified"
                    ? "Pendaftaran Anda sudah diverifikasi oleh panitia sehingga data terkunci."
                    : "Periode ini sudah tidak berstatus 'buka', pendaftaran dalam mode baca saja."}
                </span>
              </div>
            )}
          </div>

          {/* Form Pendaftaran */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Biodata Mahasiswa */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">1. Biodata Mahasiswa</h2>
              <p className="mt-1 text-xs text-slate-500">
                Isi identitas akademik sesuai Kartu Tanda Mahasiswa (KTM) Anda.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    NIM (Nomor Induk Mahasiswa)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    placeholder="Contoh: 2301001"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm disabled:bg-slate-100"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Contoh: <span className="font-mono">2301001</span>
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder="Contoh: Andi Pratama"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm disabled:bg-slate-100"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Sesuai nama pada KTM / KTP</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Program Studi
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLocked}
                    value={programStudi}
                    onChange={(e) => setProgramStudi(e.target.value)}
                    placeholder="Contoh: Teknik Informatika"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm disabled:bg-slate-100"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Contoh: Teknik Informatika, Sistem Informasi
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Data Penilaian & Kondisi Mahasiswa */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    2. Data Akademik, Ekonomi &amp; Prestasi Mahasiswa
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Lengkapi setiap kolom di bawah sesuai bukti dokumen. Klik tombol panduan untuk
                    melihat contoh pengisian lengkap.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGuideExample((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <BookOpen className="h-4 w-4" />
                  Contoh Pengisian Lengkap
                  {showGuideExample ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Panel Contoh Pengisian Lengkap */}
              {showGuideExample && (
                <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-bold text-indigo-900">
                      <HelpCircle className="h-4 w-4 text-indigo-600" />
                      Contoh Kasus: Mahasiswa bernama Andi Pratama (Semester 6)
                    </p>
                    {!isLocked && criteria.length > 0 && (
                      <button
                        type="button"
                        onClick={handleApplySampleExample}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Isi Cepat dengan Contoh Ini
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl bg-white/90 p-2.5">
                      <p className="font-semibold text-slate-900">IPK: 3.85</p>
                      <p className="mt-0.5 text-slate-500">
                        IPK pada transkrip terakhir adalah 3,85.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/90 p-2.5">
                      <p className="font-semibold text-slate-900">Penghasilan Orang Tua: 2.5</p>
                      <p className="mt-0.5 text-slate-500">
                        Total gaji ayah &amp; ibu Rp 2.500.000/bulan (ditulis dalam juta).
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/90 p-2.5">
                      <p className="font-semibold text-slate-900">Jumlah Tanggungan: 3</p>
                      <p className="mt-0.5 text-slate-500">
                        Orang tua membiayai Anda sendiri + 2 adik yang masih sekolah.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/90 p-2.5">
                      <p className="font-semibold text-slate-900">Skor Prestasi: 80</p>
                      <p className="mt-0.5 text-slate-500">
                        1× Juara Tingkat Nasional (60) + 1× Tingkat Kampus (20) = 80.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/90 p-2.5">
                      <p className="font-semibold text-slate-900">Semester Berjalan: 6</p>
                      <p className="mt-0.5 text-slate-500">
                        Saat ini berstatus mahasiswa aktif semester 6.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {criteria.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Admin belum menambahkan daftar kriteria penilaian.
                </p>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {criteria.map((c) => {
                    const guide = getCriterionGuide(c);
                    const currentVal = scoreValues[c.id] ?? "";
                    const rupiahPreview =
                      guide.key === "penghasilan" ? formatRupiahPreview(currentVal) : null;
                    const looksLikeFullRupiah =
                      guide.key === "penghasilan" && Number(currentVal) >= 1000;

                    return (
                      <div
                        key={c.id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition focus-within:border-indigo-300 focus-within:bg-white"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <label className="text-sm font-bold text-slate-900">
                              <span className="mr-1.5 inline-flex rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
                                {c.kode_kriteria}
                              </span>
                              {guide.displayTitle}
                            </label>
                            <StatusBadge status={c.tipe} />
                          </div>

                          <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            {guide.shortDesc}
                          </p>
                        </div>

                        <div className="mt-3 space-y-2.5">
                          {guide.key === "prestasi" ? (
                            isLocked ? (
                              <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                                <p className="text-xs text-slate-500">Skor Prestasi Tercatat</p>
                                <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-indigo-700">
                                  {currentVal === "" ? "0" : currentVal}{" "}
                                  <span className="text-xs font-normal text-slate-500">poin</span>
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2.5 rounded-xl border border-indigo-100 bg-white p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                    <Award className="h-4 w-4 text-indigo-600" />
                                    Kalkulator Prestasi Otomatis
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleResetZeroAchievement}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                    Belum Ada (0)
                                  </button>
                                </div>

                                {existingApplicant && !achievementTouched && currentVal !== "" && (
                                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                                    Skor tersimpan saat ini: <strong>{currentVal}</strong>. Ubah
                                    daftar tingkat prestasi di bawah untuk menghitung ulang secara
                                    otomatis.
                                  </div>
                                )}

                                <div className="space-y-2">
                                  {achievementRows.map((row, rowIdx) => {
                                    const lvlMeta = ACHIEVEMENT_LEVEL_MAP[row.level];
                                    const rowSubtotal =
                                      (lvlMeta?.points || 0) *
                                      Math.max(0, Math.floor(Number(row.count) || 0));

                                    return (
                                      <div
                                        key={rowIdx}
                                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2"
                                      >
                                        <select
                                          aria-label={`Tingkat prestasi baris ${rowIdx + 1}`}
                                          value={row.level}
                                          onChange={(e) =>
                                            handleAchievementRowChange(
                                              rowIdx,
                                              "level",
                                              e.target.value
                                            )
                                          }
                                          className="min-w-[155px] flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                                        >
                                          {ACHIEVEMENT_LEVELS.map((lvl) => (
                                            <option key={lvl.value} value={lvl.value}>
                                              {lvl.label} ({lvl.points} poin)
                                            </option>
                                          ))}
                                        </select>

                                        <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleAchievementRowChange(
                                                rowIdx,
                                                "count",
                                                Math.max(0, (Number(row.count) || 0) - 1)
                                              )
                                            }
                                            className="px-2 py-1.5 text-slate-600 hover:bg-slate-100"
                                            aria-label="Kurangi jumlah prestasi"
                                          >
                                            <Minus className="h-3.5 w-3.5" />
                                          </button>
                                          <input
                                            type="number"
                                            min={0}
                                            aria-label={`Jumlah prestasi diraih baris ${rowIdx + 1}`}
                                            value={row.count}
                                            onChange={(e) =>
                                              handleAchievementRowChange(
                                                rowIdx,
                                                "count",
                                                e.target.value
                                              )
                                            }
                                            className="w-11 border-x border-slate-200 py-1 text-center text-xs font-semibold tabular-nums text-slate-900 focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleAchievementRowChange(
                                                rowIdx,
                                                "count",
                                                (Number(row.count) || 0) + 1
                                              )
                                            }
                                            className="px-2 py-1.5 text-slate-600 hover:bg-slate-100"
                                            aria-label="Tambah jumlah prestasi"
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                          </button>
                                        </div>

                                        <span className="min-w-[58px] text-right font-mono text-xs font-bold tabular-nums text-indigo-700">
                                          = {rowSubtotal}
                                        </span>

                                        {achievementRows.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveAchievementRow(rowIdx)}
                                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                            title="Hapus baris prestasi"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                <button
                                  type="button"
                                  onClick={handleAddAchievementRow}
                                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100/70"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Tambah Tingkat Prestasi Lain
                                </button>

                                {/* Hasil Real-Time Skor Prestasi */}
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-white">
                                  <p className="text-[11px] font-medium text-indigo-100">
                                    Total Skor Prestasi (Otomatis Real-Time)
                                  </p>
                                  <span className="font-mono text-lg font-extrabold tabular-nums">
                                    {achievementTouched || currentVal === ""
                                      ? achievementSummary.finalScore
                                      : currentVal}{" "}
                                    <span className="text-xs font-normal text-indigo-200">
                                      poin
                                    </span>
                                  </span>
                                </div>
                              </div>
                            )
                          ) : (
                            <>
                              <input
                                type="number"
                                step="0.0001"
                                min={c.tipe === "cost" ? "0.0001" : "0"}
                                required
                                disabled={isLocked}
                                value={currentVal}
                                onChange={(e) =>
                                  setScoreValues((prev) => ({
                                    ...prev,
                                    [c.id]: e.target.value,
                                  }))
                                }
                                placeholder={guide.placeholder}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                              />

                              {/* Live konversi Rupiah untuk Penghasilan Orang Tua */}
                              {rupiahPreview && !looksLikeFullRupiah && (
                                <p className="text-xs font-semibold text-indigo-700">
                                  Setara dengan {rupiahPreview} / bulan
                                </p>
                              )}
                              {looksLikeFullRupiah && (
                                <p className="flex items-center gap-1 text-xs font-medium text-amber-700">
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                  Isi dalam satuan Juta Rupiah (misal <strong>2.5</strong> untuk Rp
                                  2.500.000, bukan 2500000).
                                </p>
                              )}

                              {/* Pilihan cepat contoh (Tanggungan, Penghasilan, Semester) */}
                              {guide.presets && !isLocked && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="text-[11px] font-medium text-slate-500">
                                    Pilih cepat:
                                  </span>
                                  {guide.presets.map((preset) => {
                                    const isSelected =
                                      String(currentVal) === String(preset.value);
                                    return (
                                      <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() =>
                                          setScoreValues((prev) => ({
                                            ...prev,
                                            [c.id]: preset.value,
                                          }))
                                        }
                                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition ${
                                          isSelected
                                            ? "border-indigo-600 bg-indigo-600 text-white"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                                        }`}
                                      >
                                        {preset.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}

                          <div className="rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-slate-500 ring-1 ring-slate-200/70">
                            {guide.exampleText}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Upload Berkas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    3. Berkas Persyaratan (PDF / JPG / PNG, maks 5 MB)
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Gabungkan transkrip nilai IPK, slip gaji/surat keterangan penghasilan orang tua,
                    Kartu Keluarga (untuk jumlah tanggungan), dan sertifikat prestasi.
                  </p>
                </div>
                {existingApplicant?.has_berkas && (
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    <FileText className="h-4 w-4" />
                    Lihat Berkas Tersimpan
                  </button>
                )}
              </div>

              {!isLocked && (
                <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30">
                  <UploadCloud className="h-8 w-8 text-indigo-500" />
                  <span className="mt-2 text-sm font-medium text-slate-700">
                    {selectedFile
                      ? `File dipilih: ${selectedFile.name}`
                      : existingApplicant?.has_berkas
                        ? "Klik untuk mengganti berkas persyaratan"
                        : "Klik untuk memilih file PDF, JPG, atau PNG"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </label>
              )}
            </div>

            {!isLocked && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || criteria.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {submitting
                    ? "Menyimpan..."
                    : existingApplicant
                      ? "Perbarui Pendaftaran & Nilai"
                      : "Kirim Pendaftaran Beasiswa"}
                </button>
              </div>
            )}
          </form>
        </>
      )}

      <BerkasPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        applicant={existingApplicant}
      />
    </div>
  );
}
