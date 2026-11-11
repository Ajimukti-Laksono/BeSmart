import { useCallback, useEffect, useState } from "react";
import { Award, CheckCircle2, Clock, FileText, Info } from "lucide-react";
import { getApplicantsApi } from "../../api/applicants";
import { getArasResultsApi } from "../../api/aras";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../utils/error";
import BerkasPreviewModal from "../../components/BerkasPreviewModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

export default function ApplicationStatusPage() {
  const toast = useToast();

  const [applicants, setApplicants] = useState([]);
  const [resultsByPeriod, setResultsByPeriod] = useState({});
  const [loading, setLoading] = useState(true);
  const [previewTarget, setPreviewTarget] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApplicantsApi();
      setApplicants(data);

      // Ambil pengumuman resmi hanya untuk periode yang berstatus 'selesai'
      const finishedPeriodIds = [
        ...new Set(
          data
            .filter((item) => item.period_status === "selesai")
            .map((item) => item.period_id)
        ),
      ];

      if (finishedPeriodIds.length > 0) {
        const entries = await Promise.all(
          finishedPeriodIds.map(async (pid) => {
            try {
              const res = await getArasResultsApi(pid);
              return [pid, res];
            } catch {
              return [pid, null];
            }
          })
        );
        setResultsByPeriod(Object.fromEntries(entries));
      } else {
        setResultsByPeriod({});
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat status pendaftaran."));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  if (loading) {
    return <LoadingSpinner label="Memuat status pendaftaran dan pengumuman..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Status Pendaftaran &amp; Pengumuman
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Pantau progres verifikasi panitia dan pengumuman kelulusan resmi setelah periode
          beasiswa berstatus selesai.
        </p>
      </div>

      {applicants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Award className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Anda belum memiliki riwayat pendaftaran beasiswa
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Buka menu Pendaftaran Beasiswa untuk mengajukan pendaftaran pada periode aktif.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applicants.map((item) => {
            const periodResult = resultsByPeriod[item.period_id];
            const myOutcome = periodResult?.my_result;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{item.period_nama}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      NIM {item.nim} • {item.nama_lengkap} • {item.program_studi}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div>
                      <span>Verifikasi: </span>
                      <StatusBadge status={item.status_verifikasi} />
                    </div>
                    <div>
                      <span>Periode: </span>
                      <StatusBadge status={item.period_status} />
                    </div>
                  </div>
                </div>

                {/* Pengumuman Kelulusan */}
                {item.period_status !== "selesai" ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-800">
                    <Clock className="h-5 w-5 shrink-0 text-indigo-600" />
                    <span>
                      Pengumuman kelulusan seleksi ARAS hanya dapat dilihat setelah periode
                      beasiswa berstatus <strong>Selesai</strong>.
                    </span>
                  </div>
                ) : item.status_verifikasi !== "verified" ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <Info className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>
                      Pendaftaran Anda berstatus{" "}
                      <strong>{item.status_verifikasi}</strong> sehingga tidak diikutsertakan
                      dalam pemeringkatan ARAS.
                    </span>
                  </div>
                ) : !myOutcome ? (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                    <span>Hasil kalkulasi ARAS untuk periode ini belum tersedia.</span>
                  </div>
                ) : myOutcome.status_lolos === "lolos" ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-base font-bold text-emerald-950">
                            Selamat! Anda Dinyatakan LOLOS Seleksi Beasiswa
                          </p>
                          <p className="mt-0.5 text-sm text-emerald-800">
                            Anda masuk dalam kuota {periodResult.kuota_penerima} penerima terbaik
                            berdasarkan perhitungan metode ARAS.
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="lolos" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-white/80 p-3 text-center text-xs">
                      <div>
                        <p className="text-slate-500">Ranking</p>
                        <p className="mt-0.5 font-mono text-lg font-bold text-slate-900">
                          #{myOutcome.ranking}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Nilai S<sub>i</sub></p>
                        <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-800">
                          {Number(myOutcome.nilai_si).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Derajat Utilitas K<sub>i</sub></p>
                        <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-emerald-700">
                          {Number(myOutcome.nilai_ki).toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-bold text-slate-900">
                          Mohon Maaf, Anda Belum Lolos Kuota Periode Ini
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          Peringkat Anda berada di luar kuota {periodResult.kuota_penerima}{" "}
                          penerima. Tetap semangat untuk kesempatan berikutnya.
                        </p>
                      </div>
                      <StatusBadge status="tidak_lolos" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-white p-3 text-center text-xs">
                      <div>
                        <p className="text-slate-500">Ranking</p>
                        <p className="mt-0.5 font-mono text-lg font-bold text-slate-900">
                          #{myOutcome.ranking}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Nilai S<sub>i</sub></p>
                        <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-slate-800">
                          {Number(myOutcome.nilai_si).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Derajat Utilitas K<sub>i</sub></p>
                        <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-slate-700">
                          {Number(myOutcome.nilai_ki).toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ringkasan Nilai & Berkas */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {item.scores.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        <strong className="font-mono text-indigo-700">{s.kode_kriteria}:</strong>{" "}
                        <span className="tabular-nums">{s.nilai_input}</span>
                      </span>
                    ))}
                  </div>
                  {item.has_berkas && (
                    <button
                      type="button"
                      onClick={() => setPreviewTarget(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Preview Berkas
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BerkasPreviewModal
        isOpen={Boolean(previewTarget)}
        onClose={() => setPreviewTarget(null)}
        applicant={previewTarget}
      />
    </div>
  );
}
