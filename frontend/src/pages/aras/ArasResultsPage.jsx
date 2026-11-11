import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Search,
  Trophy,
} from "lucide-react";
import { getArasResultsApi } from "../../api/aras";
import { getPeriodsApi, updatePeriodStatusApi } from "../../api/periods";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../utils/error";
import { exportResultsToExcel, exportResultsToPdf } from "../../utils/exportReport";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-bold text-slate-900">
        #{item.ranking} — {item.nama_lengkap}
      </p>
      <p className="text-slate-500">NIM: {item.nim}</p>
      <p className="mt-1 font-mono font-semibold text-indigo-700">
        K<sub>i</sub>: {Number(item.nilai_ki).toFixed(6)}
      </p>
      <p className="font-mono text-slate-600">S<sub>i</sub>: {Number(item.nilai_si).toFixed(6)}</p>
      <p className="mt-1 font-semibold">
        Status:{" "}
        <span className={item.status_lolos === "lolos" ? "text-emerald-600" : "text-slate-500"}>
          {item.status_lolos === "lolos" ? "Lolos" : "Tidak Lolos"}
        </span>
      </p>
    </div>
  );
}

export default function ArasResultsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchPeriods = useCallback(async () => {
    try {
      const list = await getPeriodsApi();
      setPeriods(list);
      if (list.length > 0) {
        setSelectedPeriodId((prev) => prev || String(list[0].id));
      } else {
        setLoading(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat daftar periode."));
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const fetchResults = useCallback(async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    try {
      const data = await getArasResultsApi(selectedPeriodId);
      setResultsData(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat hasil seleksi ARAS."));
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId, toast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const filteredResults = useMemo(() => {
    const items = resultsData?.results || [];
    return items.filter((item) => {
      if (statusFilter && item.status_lolos !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          item.nim.toLowerCase().includes(q) ||
          item.nama_lengkap.toLowerCase().includes(q) ||
          item.program_studi.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [resultsData, statusFilter, search]);

  const chartData = useMemo(() => {
    return (resultsData?.results || []).map((item) => ({
      ...item,
      shortLabel: `#${item.ranking} ${item.nama_lengkap.split(" ")[0]}`,
    }));
  }, [resultsData]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => String(p.id) === String(selectedPeriodId)) || null,
    [periods, selectedPeriodId]
  );

  const isStaleResults = Boolean(
    resultsData?.has_results &&
      selectedPeriod &&
      selectedPeriod.verified_applicants !== resultsData.total_candidates
  );

  const handlePublish = async () => {
    if (!resultsData) return;
    setPublishing(true);
    try {
      await updatePeriodStatusApi(resultsData.period_id, { status: "selesai" });
      toast.success("Status periode diubah menjadi 'selesai'. Pengumuman kini terlihat oleh mahasiswa.");
      setPublishConfirmOpen(false);
      fetchPeriods();
      fetchResults();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal mempublikasikan hasil periode."));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hasil Seleksi &amp; Rekap Penerima Beasiswa
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Peringkat akhir berdasarkan derajat utilitas K<sub>i</sub> metode ARAS dan ekspor
            laporan resmi.
          </p>
        </div>

        {resultsData?.has_results && (
          <div className="flex flex-wrap items-center gap-2.5">
            {user?.role === "admin" && resultsData.period_status !== "selesai" && (
              <button
                type="button"
                onClick={() => setPublishConfirmOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Publikasikan (Set Selesai)
              </button>
            )}
            <button
              type="button"
              onClick={() => exportResultsToPdf(resultsData)}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
            >
              <FileText className="h-4 w-4" />
              Ekspor PDF (SK)
            </button>
            <button
              type="button"
              onClick={() => exportResultsToExcel(resultsData)}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Ekspor Excel
            </button>
          </div>
        )}
      </div>

      {/* Pemilih Periode */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-[260px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Periode Beasiswa</label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium focus:border-indigo-500 focus:outline-none"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama_periode} (Kuota: {p.kuota_penerima})
              </option>
            ))}
          </select>
        </div>
        {resultsData && (
          <div className="flex items-center gap-3">
            <StatusBadge status={resultsData.period_status} />
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner label="Memuat hasil peringkat ARAS..." />
      ) : !resultsData?.has_results ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Hasil seleksi ARAS belum tersedia untuk periode ini
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Admin perlu menjalankan kalkulasi pada halaman Kalkulasi ARAS terlebih dahulu.
          </p>
        </div>
      ) : (
        <>
          {isStaleResults && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-sm text-amber-950">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <span>
                  Terdapat perubahan data: saat ini ada{" "}
                  <strong>{selectedPeriod.verified_applicants} pendaftar verified</strong>,
                  sedangkan hasil ini baru menghitung{" "}
                  <strong>{resultsData.total_candidates} pendaftar</strong>.
                </span>
              </div>
              {user?.role === "admin" && (
                <Link
                  to="/admin/aras/calculate"
                  className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Hitung Ulang ARAS
                </Link>
              )}
            </div>
          )}

          {/* Ringkasan KPI */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Total Dinilai (Verified)</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                {resultsData.total_candidates}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Kuota Penerima</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-700">
                {resultsData.kuota_penerima}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
              <p className="text-xs font-medium text-emerald-800">Dinyatakan Lolos</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
                {resultsData.total_lolos}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">
                K<sub>i</sub> Tertinggi
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                {resultsData.results[0]
                  ? Number(resultsData.results[0].nilai_ki).toFixed(4)
                  : "-"}
              </p>
            </div>
          </div>

          {/* Grafik Recharts Perbandingan Ki */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Grafik Perbandingan Derajat Utilitas (K<sub>i</sub>)
                </h2>
                <p className="text-xs text-slate-500">
                  Hijau menandakan kandidat lolos seleksi; abu-abu menandakan tidak lolos kuota.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-500" />
                  Lolos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-slate-400" />
                  Tidak Lolos
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    angle={-20}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickFormatter={(val) => val.toFixed(2)}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="nilai_ki" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.applicant_id}
                        fill={entry.status_lolos === "lolos" ? "#10b981" : "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabel Ranking */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari NIM, nama, atau prodi..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700"
              >
                <option value="">Semua Kelulusan</option>
                <option value="lolos">Lolos</option>
                <option value="tidak_lolos">Tidak Lolos</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-center">Ranking</th>
                    <th className="px-4 py-3">NIM</th>
                    <th className="px-4 py-3">Nama Lengkap</th>
                    <th className="px-4 py-3">Program Studi</th>
                    <th className="px-4 py-3 text-right">Nilai S<sub>i</sub></th>
                    <th className="px-4 py-3 text-right">Nilai K<sub>i</sub></th>
                    <th className="px-4 py-3 text-center">Status Kelulusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((item) => (
                    <tr
                      key={item.applicant_id}
                      className={
                        item.status_lolos === "lolos"
                          ? "bg-emerald-50/30 hover:bg-emerald-50/60"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                        #{item.ranking}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{item.nim}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.nama_lengkap}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.program_studi}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                        {Number(item.nilai_si).toFixed(6)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-indigo-700">
                        {Number(item.nilai_ki).toFixed(6)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={item.status_lolos} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={publishConfirmOpen}
        onClose={() => setPublishConfirmOpen(false)}
        onConfirm={handlePublish}
        title="Publikasikan Pengumuman Kelulusan?"
        message={`Status periode "${resultsData?.nama_periode}" akan diubah menjadi 'selesai' sehingga mahasiswa dapat melihat hasil kelulusannya masing-masing.`}
        confirmLabel="Ya, Publikasikan"
        variant="primary"
        isLoading={publishing}
      />
    </div>
  );
}

