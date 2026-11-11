import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CalendarRange, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createPeriodApi,
  deletePeriodApi,
  getPeriodsApi,
  updatePeriodApi,
  updatePeriodStatusApi,
} from "../../api/periods";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../utils/error";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

const EMPTY_FORM = {
  nama_periode: "",
  kuota_penerima: 5,
  status: "buka",
  is_active: true,
};

export default function PeriodsPage() {
  const toast = useToast();

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPeriodsApi();
      setPeriods(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat daftar periode."));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const openCreate = () => {
    setEditingPeriod(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (period) => {
    setEditingPeriod(period);
    setForm({
      nama_periode: period.nama_periode,
      kuota_penerima: period.kuota_penerima,
      status: period.status,
      is_active: period.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const kuota = Number(form.kuota_penerima);
    if (form.nama_periode.trim().length < 3) {
      toast.error("Nama periode minimal 3 karakter.");
      return;
    }
    if (!Number.isInteger(kuota) || kuota <= 0) {
      toast.error("Kuota penerima harus bilangan bulat lebih dari 0.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama_periode: form.nama_periode.trim(),
        kuota_penerima: kuota,
        status: form.status,
        is_active: Boolean(form.is_active),
      };
      if (editingPeriod) {
        await updatePeriodApi(editingPeriod.id, payload);
        toast.success("Periode beasiswa berhasil diperbarui.");
      } else {
        await createPeriodApi(payload);
        toast.success("Periode beasiswa baru berhasil dibuat.");
      }
      setModalOpen(false);
      fetchPeriods();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menyimpan periode beasiswa."));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (period, nextStatus) => {
    setUpdatingStatusId(period.id);
    try {
      await updatePeriodStatusApi(period.id, { status: nextStatus });
      toast.success(`Status "${period.nama_periode}" diubah ke ${nextStatus}.`);
      fetchPeriods();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal mengubah status periode."));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePeriodApi(deleteTarget.id);
      toast.success(`Periode "${deleteTarget.nama_periode}" berhasil dihapus.`);
      setDeleteTarget(null);
      fetchPeriods();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menghapus periode."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Periode Beasiswa
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Atur jadwal pendaftaran, kuota penerima, dan status publikasi pengumuman.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Tambah Periode
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingSpinner label="Memuat periode beasiswa..." />
        ) : periods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CalendarRange className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Belum ada periode beasiswa</p>
            <p className="mt-1 text-xs text-slate-500">
              Tambahkan periode baru agar mahasiswa dapat melakukan pendaftaran.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Nama Periode</th>
                  <th className="px-5 py-3.5">Kuota</th>
                  <th className="px-5 py-3.5">Statistik Pendaftar</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Aktif</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {period.nama_periode}
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-700">
                      {period.kuota_penerima} orang
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">
                        Total: {period.total_applicants}
                      </span>{" "}
                      <span className="text-emerald-700">
                        ({period.verified_applicants} verified)
                      </span>
                      {period.pending_applicants > 0 && (
                        <span className="ml-1 text-amber-700">
                          • {period.pending_applicants} pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={period.status} />
                        <select
                          aria-label={`Ubah status ${period.nama_periode}`}
                          value={period.status}
                          disabled={updatingStatusId === period.id}
                          onChange={(e) => handleQuickStatusChange(period, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="buka">buka</option>
                          <option value="proses">proses</option>
                          <option value="selesai">selesai</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          period.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {period.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(period)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                          title="Edit periode"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(period)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                          title="Hapus periode"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Periode */}
      <Dialog
        open={modalOpen}
        onClose={saving ? () => {} : () => setModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {editingPeriod ? "Edit Periode Beasiswa" : "Tambah Periode Beasiswa"}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nama Periode
                </label>
                <input
                  type="text"
                  required
                  value={form.nama_periode}
                  onChange={(e) => setForm((f) => ({ ...f, nama_periode: e.target.value }))}
                  placeholder="Misal: Beasiswa Prestasi Akademik 2026"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Kuota Penerima
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.kuota_penerima}
                  onChange={(e) => setForm((f) => ({ ...f, kuota_penerima: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="buka">Dibuka (Pendaftaran Aktif)</option>
                  <option value="proses">Diproses (Kalkulasi & Tinjauan)</option>
                  <option value="selesai">Selesai (Pengumuman Terbit)</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Periode aktif ditampilkan
              </label>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Periode Beasiswa?"
        message={`Periode "${deleteTarget?.nama_periode}" beserta seluruh data pendaftar dan hasil ARAS terkait akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        isLoading={deleting}
      />
    </div>
  );
}

