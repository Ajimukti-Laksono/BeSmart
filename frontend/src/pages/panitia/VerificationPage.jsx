import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { getApplicantsApi, verifyApplicantApi } from "../../api/applicants";
import { getPeriodsApi } from "../../api/periods";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../utils/error";
import BerkasPreviewModal from "../../components/BerkasPreviewModal";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

export default function VerificationPage() {
  const toast = useToast();

  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const [detailTarget, setDetailTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [verifyAction, setVerifyAction] = useState(null); // { applicant, status }
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function loadPeriods() {
      try {
        const list = await getPeriodsApi();
        setPeriods(list);
      } catch (err) {
        toast.error(getErrorMessage(err, "Gagal memuat daftar periode."));
      }
    }
    loadPeriods();
  }, [toast]);

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedPeriodId) params.period_id = Number(selectedPeriodId);
      if (statusFilter) params.status_verifikasi = statusFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const data = await getApplicantsApi(params);
      setApplicants(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat daftar pendaftar."));
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId, statusFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  const summary = useMemo(() => {
    return applicants.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status_verifikasi] = (acc[item.status_verifikasi] || 0) + 1;
        return acc;
      },
      { total: 0, pending: 0, verified: 0, rejected: 0 }
    );
  }, [applicants]);

  const handleConfirmVerify = async () => {
    if (!verifyAction) return;
    setVerifying(true);
    try {
      const updated = await verifyApplicantApi(
        verifyAction.applicant.id,
        verifyAction.status
      );
      toast.success(
        `Status verifikasi "${updated.nama_lengkap}" diubah menjadi ${updated.status_verifikasi}.`
      );
      setVerifyAction(null);
      if (detailTarget?.id === updated.id) {
        setDetailTarget(updated);
      }
      fetchApplicants();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memperbarui status verifikasi."));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Verifikasi Data &amp; Berkas Pendaftar
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Periksa kelengkapan biodata, nilai kriteria, dan dokumen persyaratan sebelum perhitungan
          ARAS.
        </p>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ditampilkan</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-800">Pending</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700">{summary.pending}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-800">Verified</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">
            {summary.verified}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm">
          <p className="text-xs font-medium text-rose-800">Rejected</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-700">{summary.rejected}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari NIM, nama lengkap, atau program studi..."
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Semua Periode</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama_periode}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Tabel Pendaftar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingSpinner label="Memuat data pendaftar..." />
        ) : applicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <ClipboardCheck className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Tidak ada pendaftar yang sesuai filter
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ubah kata kunci pencarian atau filter status untuk melihat data lainnya.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">NIM &amp; Nama</th>
                  <th className="px-5 py-3.5">Program Studi</th>
                  <th className="px-5 py-3.5">Periode</th>
                  <th className="px-5 py-3.5">Nilai &amp; Berkas</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applicants.map((item) => {
                  const locked = item.period_status === "selesai";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{item.nama_lengkap}</p>
                        <p className="font-mono text-xs text-slate-500">{item.nim}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{item.program_studi}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{item.period_nama}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {item.scores.length} nilai
                          </span>
                          {item.has_berkas ? (
                            <button
                              type="button"
                              onClick={() => setPreviewTarget(item)}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Berkas
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Tanpa berkas</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={item.status_verifikasi} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailTarget(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </button>
                          <button
                            type="button"
                            disabled={locked || item.status_verifikasi === "verified"}
                            onClick={() =>
                              setVerifyAction({ applicant: item, status: "verified" })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Verifikasi pendaftar"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verify
                          </button>
                          <button
                            type="button"
                            disabled={locked || item.status_verifikasi === "rejected"}
                            onClick={() =>
                              setVerifyAction({ applicant: item, status: "rejected" })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Tolak pendaftar"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Pendaftar & Nilai */}
      <Dialog
        open={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        className="relative z-40"
      >
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {detailTarget?.nama_lengkap}
                </DialogTitle>
                <p className="text-sm text-slate-500">
                  NIM {detailTarget?.nim} • {detailTarget?.program_studi}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3.5 text-sm">
              <div>
                <p className="text-xs text-slate-500">Periode</p>
                <p className="font-semibold text-slate-800">{detailTarget?.period_nama}</p>
              </div>
              <StatusBadge status={detailTarget?.status_verifikasi} />
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-800">Nilai Kriteria Diinput</h3>
              {detailTarget?.scores?.length ? (
                <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {detailTarget.scores.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-700">
                          {s.kode_kriteria}
                        </span>{" "}
                        <span className="font-medium text-slate-800">{s.nama_kriteria}</span>
                        <span className="ml-2">
                          <StatusBadge status={s.tipe} />
                        </span>
                      </div>
                      <span className="font-mono font-semibold tabular-nums text-slate-900">
                        {s.nilai_input}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Belum ada nilai kriteria yang diisi.</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              {detailTarget?.has_berkas ? (
                <button
                  type="button"
                  onClick={() => setPreviewTarget(detailTarget)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <FileText className="h-4 w-4" />
                  Preview Berkas
                </button>
              ) : (
                <span className="text-xs text-slate-400">Berkas belum diunggah</span>
              )}

              {detailTarget?.period_status !== "selesai" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={detailTarget?.status_verifikasi === "rejected"}
                    onClick={() =>
                      setVerifyAction({ applicant: detailTarget, status: "rejected" })
                    }
                    className="rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    disabled={detailTarget?.status_verifikasi === "verified"}
                    onClick={() =>
                      setVerifyAction({ applicant: detailTarget, status: "verified" })
                    }
                    className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Verifikasi
                  </button>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <BerkasPreviewModal
        isOpen={Boolean(previewTarget)}
        onClose={() => setPreviewTarget(null)}
        applicant={previewTarget}
      />

      <ConfirmModal
        isOpen={Boolean(verifyAction)}
        onClose={() => setVerifyAction(null)}
        onConfirm={handleConfirmVerify}
        title={
          verifyAction?.status === "verified"
            ? "Verifikasi Pendaftar?"
            : "Tolak Pendaftar?"
        }
        message={
          verifyAction?.status === "verified"
            ? `Pendaftar "${verifyAction?.applicant?.nama_lengkap}" akan ditandai VERIFIED dan diikutsertakan dalam kalkulasi ARAS.`
            : `Pendaftar "${verifyAction?.applicant?.nama_lengkap}" akan ditandai REJECTED dan tidak diikutsertakan dalam seleksi.`
        }
        confirmLabel={verifyAction?.status === "verified" ? "Ya, Verifikasi" : "Ya, Tolak"}
        variant={verifyAction?.status === "verified" ? "primary" : "danger"}
        isLoading={verifying}
      />
    </div>
  );
}

