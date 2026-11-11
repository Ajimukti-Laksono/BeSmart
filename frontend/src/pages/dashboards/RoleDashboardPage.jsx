import { useEffect, useState } from "react";
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
  Award,
  Calculator,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";
import { getApplicantsApi } from "../../api/applicants";
import { getArasResultsApi } from "../../api/aras";
import { getCriteriaApi } from "../../api/criteria";
import { getPeriodsApi } from "../../api/periods";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../../components/LoadingSpinner";
import RoleBadge from "../../components/RoleBadge";
import StatusBadge from "../../components/StatusBadge";

const QUICK_LINKS_BY_ROLE = {
  admin: [
    {
      title: "Periode Beasiswa",
      desc: "Kelola periode aktif, kuota penerima, dan status publikasi.",
      to: "/admin/periods",
      icon: CalendarRange,
      accent: "bg-sky-50 text-sky-600",
    },
    {
      title: "Kriteria & Bobot",
      desc: "Atur kriteria benefit/cost serta validasi total bobot = 1.0.",
      to: "/admin/criteria",
      icon: SlidersHorizontal,
      accent: "bg-amber-50 text-amber-600",
    },
    {
      title: "Kalkulasi ARAS",
      desc: "Jalankan metode ARAS dan tinjau matriks step-by-step.",
      to: "/admin/aras/calculate",
      icon: Calculator,
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Hasil & Laporan",
      desc: "Grafik Ki, peringkat, dan ekspor laporan PDF/Excel.",
      to: "/admin/aras/results",
      icon: Trophy,
      accent: "bg-emerald-50 text-emerald-600",
    },
  ],
  panitia: [
    {
      title: "Verifikasi Pendaftar",
      desc: "Periksa biodata, nilai kriteria, dan berkas persyaratan mahasiswa.",
      to: "/panitia/verifikasi",
      icon: ClipboardCheck,
      accent: "bg-amber-50 text-amber-600",
    },
    {
      title: "Hasil Seleksi ARAS",
      desc: "Pantau peringkat dan rekap penerima beasiswa per periode.",
      to: "/panitia/hasil",
      icon: Trophy,
      accent: "bg-emerald-50 text-emerald-600",
    },
  ],
  mahasiswa: [
    {
      title: "Pendaftaran Beasiswa",
      desc: "Lengkapi biodata, input nilai kriteria, dan unggah berkas.",
      to: "/mahasiswa/pendaftaran",
      icon: FileText,
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Status & Pengumuman",
      desc: "Cek status verifikasi berkas dan hasil kelulusan setelah periode selesai.",
      to: "/mahasiswa/pengumuman",
      icon: Award,
      accent: "bg-emerald-50 text-emerald-600",
    },
  ],
};

export default function RoleDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePeriod: null,
    totalApplicants: 0,
    verifiedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    criteriaCount: 0,
    isValidWeight: false,
    topResults: [],
    myApplications: [],
  });

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [periods, criteriaRes, applicants] = await Promise.all([
          getPeriodsApi(),
          getCriteriaApi(),
          getApplicantsApi(),
        ]);

        const activePeriod = periods.find((p) => p.is_active) || periods[0] || null;
        let topResults = [];
        if (activePeriod && (user?.role === "admin" || user?.role === "panitia")) {
          try {
            const arasRes = await getArasResultsApi(activePeriod.id);
            if (arasRes?.has_results) {
              topResults = arasRes.results.slice(0, 8);
            }
          } catch {
            topResults = [];
          }
        }

        if (!active) return;
        setStats({
          activePeriod,
          totalApplicants: activePeriod
            ? activePeriod.total_applicants
            : applicants.length,
          verifiedCount: activePeriod
            ? activePeriod.verified_applicants
            : applicants.filter((a) => a.status_verifikasi === "verified").length,
          pendingCount: activePeriod
            ? activePeriod.pending_applicants
            : applicants.filter((a) => a.status_verifikasi === "pending").length,
          rejectedCount: activePeriod
            ? activePeriod.rejected_applicants
            : applicants.filter((a) => a.status_verifikasi === "rejected").length,
          criteriaCount: criteriaRes.items?.length || 0,
          isValidWeight: Boolean(criteriaRes.is_valid_weight),
          topResults,
          myApplications: applicants,
        });
      } catch {
        // Silent fallback: dashboard tetap menampilkan shortcut peran
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [user]);

  const cards = QUICK_LINKS_BY_ROLE[user?.role] || [];
  const verificationChartData = [
    { name: "Verified", jumlah: stats.verifiedCount, fill: "#10b981" },
    { name: "Pending", jumlah: stats.pendingCount, fill: "#f59e0b" },
    { name: "Rejected", jumlah: stats.rejectedCount, fill: "#f43f5e" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600">BeasiswaSmart (BeSmart)</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Selamat datang, {user?.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {stats.activePeriod
                ? `Periode Aktif: ${stats.activePeriod.nama_periode} (Kuota: ${stats.activePeriod.kuota_penerima} penerima)`
                : "Belum ada periode beasiswa aktif saat ini."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stats.activePeriod && <StatusBadge status={stats.activePeriod.status} />}
            <RoleBadge role={user?.role} />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Memuat ringkasan dashboard..." />
      ) : (
        <>
          {/* Ringkasan Statistik Admin & Panitia */}
          {(user?.role === "admin" || user?.role === "panitia") && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Total Pendaftar</p>
                    <Users className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {stats.totalApplicants}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-emerald-800">Terverifikasi</p>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700">
                    {stats.verifiedCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-amber-800">Menunggu Verifikasi</p>
                    <ClipboardCheck className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-amber-700">
                    {stats.pendingCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                      {user?.role === "admin" ? "Kriteria & Bobot" : "Kuota Periode Aktif"}
                    </p>
                    <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
                  </div>
                  {user?.role === "admin" ? (
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {stats.criteriaCount} kriteria{" "}
                      <span
                        className={`ml-1 text-xs font-semibold ${
                          stats.isValidWeight ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        ({stats.isValidWeight ? "Bobot Valid" : "Cek Bobot"})
                      </span>
                    </p>
                  ) : (
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                      {stats.activePeriod?.kuota_penerima ?? 0} orang
                    </p>
                  )}
                </div>
              </div>

              {/* Grafik Dashboard */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900">
                    Distribusi Status Verifikasi Pendaftar
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Hanya pendaftar Verified yang dihitung dalam algoritma ARAS.
                  </p>
                  <div className="mt-4 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={verificationChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#475569" }} />
                        <Tooltip />
                        <Bar dataKey="jumlah" radius={[8, 8, 0, 0]}>
                          {verificationChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900">
                    Peringkat Utilitas K<sub>i</sub> Teratas
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {stats.topResults.length > 0
                      ? "Hasil kalkulasi ARAS terbaru pada periode aktif."
                      : "Jalankan kalkulasi ARAS untuk melihat grafik perbandingan Ki."}
                  </p>
                  {stats.topResults.length > 0 ? (
                    <div className="mt-4 h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.topResults.map((r) => ({
                            name: `#${r.ranking} ${r.nama_lengkap.split(" ")[0]}`,
                            ki: Number(r.nilai_ki),
                            status_lolos: r.status_lolos,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
                          <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#475569" }} />
                          <Tooltip />
                          <Bar dataKey="ki" radius={[6, 6, 0, 0]}>
                            {stats.topResults.map((entry) => (
                              <Cell
                                key={entry.applicant_id}
                                fill={entry.status_lolos === "lolos" ? "#10b981" : "#94a3b8"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="mt-8 flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                      Belum ada hasil kalkulasi ARAS pada periode aktif.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Ringkasan Mahasiswa */}
          {user?.role === "mahasiswa" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Pendaftaran Saya</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
                  {stats.myApplications.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Status Verifikasi Terbaru</p>
                <div className="mt-2">
                  {stats.myApplications[0] ? (
                    <StatusBadge status={stats.myApplications[0].status_verifikasi} />
                  ) : (
                    <span className="text-sm text-slate-400">Belum mendaftar</span>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Kriteria Penilaian</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
                  {stats.criteriaCount} kriteria
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pintasan Menu Sesuai Peran */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.accent}`}
              >
                <IconComponent className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900 group-hover:text-indigo-600">
                {card.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{card.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
