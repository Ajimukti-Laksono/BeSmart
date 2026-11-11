import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Play,
  Sparkles,
} from "lucide-react";
import { calculateArasApi, getArasResultsApi } from "../../api/aras";
import { getCriteriaApi } from "../../api/criteria";
import { getPeriodsApi } from "../../api/periods";
import { useToast } from "../../hooks/useToast";
import { getCriterionGuide } from "../../utils/criteriaGuide";
import { getErrorMessage } from "../../utils/error";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

const STEP_TABS = [
  "1. Matriks Awal (X + A0)",
  "2. Normalisasi (R)",
  "3. Matriks Terbobot (D)",
  "4. Optimalisasi (Si & S0)",
  "5. Derajat Utilitas (Ki)",
  "6. Ranking & Kelulusan",
];

function MatrixTable({ criteria, applicants, matrixRows, digits = 4, showWeights = false }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-xs sm:text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Alternatif</th>
            {criteria.map((c) => {
              const guide = getCriterionGuide(c);
              return (
                <th
                  key={c.id}
                  title={`${c.kode_kriteria} — ${guide.displayTitle}\n${guide.shortDesc}`}
                  className="px-4 py-3 text-right font-semibold"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
                      {c.kode_kriteria}
                    </span>
                    <span className="text-slate-900">{guide.shortLabel}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-normal text-slate-500">
                    {c.tipe}
                    {showWeights ? ` • w=${Number(c.bobot).toFixed(2)}` : ""}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {matrixRows.map((row, rowIdx) => {
            const isOptimal = rowIdx === 0;
            const applicant = isOptimal ? null : applicants[rowIdx - 1];
            return (
              <tr
                key={isOptimal ? "A0" : applicant?.applicant_id || rowIdx}
                className={
                  isOptimal
                    ? "bg-indigo-50/80 font-semibold text-indigo-950"
                    : "hover:bg-slate-50/70"
                }
              >
                <td className="px-4 py-2.5">
                  {isOptimal ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-indigo-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      A0 (Solusi Optimal)
                    </span>
                  ) : (
                    <div>
                      <span className="font-mono font-semibold text-slate-700">A{rowIdx}</span>{" "}
                      <span className="font-medium text-slate-900">
                        {applicant?.nama_lengkap}
                      </span>
                      <span className="ml-1.5 text-xs text-slate-400">({applicant?.nim})</span>
                    </div>
                  )}
                </td>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {Number(cell).toFixed(digits)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ArasCalculatePage() {
  const toast = useToast();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [criteriaInfo, setCriteriaInfo] = useState({
    items: [],
    total_bobot: 0,
    is_valid_weight: false,
  });
  const [arasData, setArasData] = useState(null);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [publishAfterCalc, setPublishAfterCalc] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const loadMetadata = useCallback(async () => {
    setLoadingInit(true);
    try {
      const [periodList, criteriaRes] = await Promise.all([
        getPeriodsApi(),
        getCriteriaApi(),
      ]);
      setPeriods(periodList);
      setCriteriaInfo(criteriaRes);
      if (periodList.length > 0) {
        setSelectedPeriodId((prev) => prev || String(periodList[0].id));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat data periode dan kriteria."));
    } finally {
      setLoadingInit(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const loadExistingResult = useCallback(
    async (periodId) => {
      if (!periodId) {
        setArasData(null);
        return;
      }
      setLoadingResults(true);
      try {
        const res = await getArasResultsApi(periodId);
        setArasData(res);
      } catch (err) {
        toast.error(getErrorMessage(err, "Gagal memuat log kalkulasi ARAS."));
      } finally {
        setLoadingResults(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadExistingResult(selectedPeriodId);
  }, [selectedPeriodId, loadExistingResult]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => String(p.id) === String(selectedPeriodId)) || null,
    [periods, selectedPeriodId]
  );

  const canCalculate = Boolean(
    selectedPeriod &&
      criteriaInfo.is_valid_weight &&
      selectedPeriod.verified_applicants > 0
  );

  const handleRunCalculation = async () => {
    if (!selectedPeriod) return;
    setCalculating(true);
    try {
      const res = await calculateArasApi(selectedPeriod.id, {
        publish: publishAfterCalc,
      });
      setArasData(res);
      setConfirmOpen(false);
      toast.success(
        publishAfterCalc
          ? "Kalkulasi ARAS berhasil dan hasil telah dipublikasikan ke mahasiswa."
          : "Kalkulasi ARAS berhasil! Tinjau matriks langkah demi langkah di bawah."
      );
      loadMetadata();
    } catch (err) {
      toast.error(getErrorMessage(err, "Kalkulasi ARAS gagal dijalankan."));
    } finally {
      setCalculating(false);
    }
  };

  const breakdown = arasData?.breakdown;
  const weightsChanged = useMemo(() => {
    if (!breakdown?.criteria || !criteriaInfo?.items?.length) return false;
    if (breakdown.criteria.length !== criteriaInfo.items.length) return true;
    const currentMap = Object.fromEntries(
      criteriaInfo.items.map((c) => [c.kode_kriteria, `${c.tipe}:${Number(c.bobot).toFixed(4)}`])
    );
    return breakdown.criteria.some(
      (c) => currentMap[c.kode_kriteria] !== `${c.tipe}:${Number(c.bobot).toFixed(4)}`
    );
  }, [breakdown, criteriaInfo]);

  const isStaleSnapshot = Boolean(
    arasData?.has_results &&
      selectedPeriod &&
      (selectedPeriod.verified_applicants !== arasData.total_candidates || weightsChanged)
  );

  if (loadingInit) {
    return <LoadingSpinner label="Menyiapkan modul kalkulasi ARAS..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Kalkulasi ARAS Interaktif
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Eksekusi metode Additive Ratio Assessment untuk pendaftar berstatus{" "}
            <span className="font-semibold text-emerald-700">verified</span> beserta rincian
            matriks tiap langkah.
          </p>
        </div>

        {arasData?.has_results && (
          <Link
            to="/admin/aras/results"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            Lihat Grafik &amp; Ekspor Laporan
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Panel Kontrol & Prasyarat Kalkulasi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Pilih Periode Beasiswa
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_periode} (Kuota: {p.kuota_penerima})
                </option>
              ))}
            </select>
          </div>

          {/* Status Prasyarat */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div
              className={`rounded-xl border p-3 ${
                criteriaInfo.is_valid_weight
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-amber-200 bg-amber-50/70"
              }`}
            >
              <p className="text-xs text-slate-600">Total Bobot Kriteria</p>
              <p className="mt-1 flex items-center gap-1.5 font-mono font-bold text-slate-900">
                {criteriaInfo.is_valid_weight ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                {criteriaInfo.total_bobot.toFixed(4)}
              </p>
            </div>

            <div
              className={`rounded-xl border p-3 ${
                (selectedPeriod?.verified_applicants || 0) > 0
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-amber-200 bg-amber-50/70"
              }`}
            >
              <p className="text-xs text-slate-600">Pendaftar Verified</p>
              <p className="mt-1 font-mono font-bold text-slate-900">
                {selectedPeriod?.verified_applicants ?? 0} orang
              </p>
            </div>
          </div>

          {/* Aksi Hitung */}
          <div className="flex flex-col justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={publishAfterCalc}
                onChange={(e) => setPublishAfterCalc(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Publikasikan langsung (ubah status periode ke <strong>selesai</strong>)
            </label>

            <button
              type="button"
              disabled={!canCalculate || calculating}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {arasData?.has_results ? "Hitung Ulang ARAS" : "Hitung ARAS"}
            </button>
          </div>
        </div>

        {!canCalculate && selectedPeriod && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Pastikan total bobot kriteria tepat <strong>1.0000</strong> dan minimal ada 1
            pendaftar berstatus <strong>verified</strong> sebelum menjalankan kalkulasi ARAS.
          </div>
        )}

        {isStaleSnapshot && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Perlu Hitung Ulang:</strong>{" "}
                {selectedPeriod.verified_applicants !== arasData.total_candidates
                  ? `Saat ini terdapat ${selectedPeriod.verified_applicants} pendaftar verified, sedangkan hasil kalkulasi tersimpan baru menghitung ${arasData.total_candidates} pendaftar. `
                  : ""}
                {weightsChanged
                  ? "Bobot atau tipe kriteria telah diperbarui sejak kalkulasi terakhir. "
                  : ""}
                Klik <strong>Hitung Ulang ARAS</strong> untuk memperbarui pemeringkatan.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Tabs */}
      {loadingResults ? (
        <LoadingSpinner label="Memuat matriks kalkulasi ARAS..." />
      ) : !arasData?.has_results || !breakdown ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Calculator className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Belum ada riwayat kalkulasi ARAS pada periode ini
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Klik tombol <strong>Hitung ARAS</strong> di atas untuk melihat breakdown langkah demi
            langkah.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Breakdown Langkah demi Langkah — {arasData.nama_periode}
              </h2>
              <p className="text-xs text-slate-500">
                Terakhir dihitung:{" "}
                {new Date(arasData.calculated_at).toLocaleString("id-ID")}
              </p>
            </div>
            <StatusBadge status={arasData.period_status} />
          </div>

          {/* Keterangan Kriteria (C1..Cn) agar Admin langsung melihat nama & arti tiap kolom */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Keterangan Kolom Kriteria
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {breakdown.criteria.map((c) => {
                const guide = getCriterionGuide(c);
                return (
                  <div
                    key={c.id}
                    className="rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        <span className="mr-1.5 font-mono font-bold text-indigo-700">
                          {c.kode_kriteria}
                        </span>
                        {guide.shortLabel}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {c.tipe} • w={Number(c.bobot).toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
                      {guide.shortDesc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <TabGroup>
            <TabList className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1.5">
              {STEP_TABS.map((label) => (
                <Tab
                  key={label}
                  className={({ selected }) =>
                    `rounded-lg px-3 py-2 text-xs font-semibold transition focus:outline-none ${
                      selected
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`
                  }
                >
                  {label}
                </Tab>
              ))}
            </TabList>

            <TabPanels className="mt-5">
              {/* Step 1: Matriks Awal + A0 */}
              <TabPanel className="space-y-3">
                <p className="text-xs text-slate-600">
                  Baris optimal <strong>A0</strong> dibentuk dari nilai maksimum untuk kriteria{" "}
                  <strong>benefit</strong> dan nilai minimum untuk kriteria <strong>cost</strong>.
                </p>
                <MatrixTable
                  criteria={breakdown.criteria}
                  applicants={breakdown.applicants}
                  matrixRows={breakdown.extended_matrix}
                  digits={4}
                  showWeights
                />
              </TabPanel>

              {/* Step 2: Normalisasi R */}
              <TabPanel className="space-y-3">
                <p className="text-xs text-slate-600">
                  Kriteria <strong>benefit</strong>: r<sub>ij</sub> = x<sub>ij</sub> / sum(x
                  <sub>ij</sub>). Kriteria <strong>cost</strong>: x&apos;<sub>ij</sub> = 1/x
                  <sub>ij</sub>, lalu r<sub>ij</sub> = x&apos;<sub>ij</sub> / sum(x&apos;
                  <sub>ij</sub>). Baris A0 ikut dijumlahkan.
                </p>
                <MatrixTable
                  criteria={breakdown.criteria}
                  applicants={breakdown.applicants}
                  matrixRows={breakdown.normalized_matrix_r}
                  digits={6}
                />
              </TabPanel>

              {/* Step 3: Matriks Terbobot D */}
              <TabPanel className="space-y-3">
                <p className="text-xs text-slate-600">
                  Setiap elemen normalisasi dikalikan dengan bobot kriteria: d<sub>ij</sub> = r
                  <sub>ij</sub> &times; w<sub>j</sub>.
                </p>
                <MatrixTable
                  criteria={breakdown.criteria}
                  applicants={breakdown.applicants}
                  matrixRows={breakdown.weighted_matrix_d}
                  digits={6}
                  showWeights
                />
              </TabPanel>

              {/* Step 4: Nilai Optimalisasi Si dan S0 */}
              <TabPanel className="space-y-4">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-xs font-medium text-indigo-700">
                    Nilai Fungsi Optimalisasi Baris Acuan (S<sub>0</sub>)
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-indigo-950">
                    S<sub>0</sub> = {Number(breakdown.s0).toFixed(8)}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Kode</th>
                        <th className="px-4 py-3">NIM</th>
                        <th className="px-4 py-3">Nama Pendaftar</th>
                        <th className="px-4 py-3 text-right">
                          Fungsi Optimalisasi (S<sub>i</sub>)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {breakdown.applicants.map((a, idx) => (
                        <tr key={a.applicant_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono font-semibold text-indigo-700">
                            A{idx + 1}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600">{a.nim}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            {a.nama_lengkap}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {Number(breakdown.si_values[idx]).toFixed(8)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabPanel>

              {/* Step 5: Derajat Utilitas Ki */}
              <TabPanel className="space-y-4">
                <p className="text-xs text-slate-600">
                  Derajat utilitas dihitung dengan membandingkan S<sub>i</sub> terhadap S
                  <sub>0</sub>: <strong>K<sub>i</sub> = S<sub>i</sub> / S<sub>0</sub></strong>.
                </p>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Alternatif</th>
                        <th className="px-4 py-3 text-right">S<sub>i</sub></th>
                        <th className="px-4 py-3 text-right">K<sub>i</sub> = S<sub>i</sub> / S<sub>0</sub></th>
                        <th className="px-4 py-3">Proporsi Utilitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {breakdown.applicants.map((a, idx) => {
                        const ki = Number(breakdown.ki_values[idx]);
                        const pct = Math.min(100, Math.max(0, ki * 100));
                        return (
                          <tr key={a.applicant_id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5">
                              <span className="font-mono font-semibold text-indigo-700">
                                A{idx + 1}
                              </span>{" "}
                              <span className="font-medium text-slate-900">{a.nama_lengkap}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                              {Number(breakdown.si_values[idx]).toFixed(6)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-indigo-700">
                              {ki.toFixed(8)}
                            </td>
                            <td className="w-48 px-4 py-2.5">
                              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-indigo-600"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabPanel>

              {/* Step 6: Ranking & Kelulusan */}
              <TabPanel className="space-y-3">
                <p className="text-xs text-slate-600">
                  Peringkat diurutkan berdasarkan nilai K<sub>i</sub> tertinggi. Pendaftar dengan{" "}
                  <strong>Ranking &le; {arasData.kuota_penerima}</strong> dinyatakan{" "}
                  <strong className="text-emerald-700">Lolos</strong>.
                </p>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-center">Rank</th>
                        <th className="px-4 py-3">NIM</th>
                        <th className="px-4 py-3">Nama Lengkap</th>
                        <th className="px-4 py-3">Program Studi</th>
                        <th className="px-4 py-3 text-right">S<sub>i</sub></th>
                        <th className="px-4 py-3 text-right">K<sub>i</sub></th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {arasData.results.map((item) => (
                        <tr key={item.applicant_id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-900">
                            #{item.ranking}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600">{item.nim}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {item.nama_lengkap}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{item.program_studi}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                            {Number(item.nilai_si).toFixed(6)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-indigo-700">
                            {Number(item.nilai_ki).toFixed(6)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <StatusBadge status={item.status_lolos} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRunCalculation}
        title="Jalankan Kalkulasi ARAS?"
        message={`Sistem akan menghitung peringkat untuk ${selectedPeriod?.verified_applicants || 0} pendaftar verified pada "${selectedPeriod?.nama_periode}" (kuota ${selectedPeriod?.kuota_penerima} orang).`}
        confirmLabel="Ya, Hitung Sekarang"
        variant="primary"
        isLoading={calculating}
      />
    </div>
  );
}

