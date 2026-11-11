import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  createCriterionApi,
  deleteCriterionApi,
  getCriteriaApi,
  updateCriterionApi,
} from "../../api/criteria";
import { useToast } from "../../hooks/useToast";
import { getCriterionGuide } from "../../utils/criteriaGuide";
import { getErrorMessage } from "../../utils/error";
import ConfirmModal from "../../components/ConfirmModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";

const EMPTY_FORM = {
  kode_kriteria: "",
  nama_kriteria: "",
  tipe: "benefit",
  bobot: "",
  keterangan: "",
};

export default function CriteriaPage() {
  const toast = useToast();

  const [criteriaData, setCriteriaData] = useState({
    items: [],
    total_bobot: 0,
    is_valid_weight: false,
    weight_difference: 1,
  });
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCriteria = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCriteriaApi();
      setCriteriaData(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat daftar kriteria."));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  const openCreate = () => {
    setEditingCriterion(null);
    const nextIdx = criteriaData.items.length + 1;
    setForm({
      ...EMPTY_FORM,
      kode_kriteria: `C${nextIdx}`,
    });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingCriterion(item);
    setForm({
      kode_kriteria: item.kode_kriteria,
      nama_kriteria: item.nama_kriteria,
      tipe: item.tipe,
      bobot: String(item.bobot),
      keterangan: item.keterangan || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const parsedBobot = Number(form.bobot);
    if (!form.kode_kriteria.trim() || !form.nama_kriteria.trim()) {
      toast.error("Kode dan nama kriteria wajib diisi.");
      return;
    }
    if (Number.isNaN(parsedBobot) || parsedBobot < 0 || parsedBobot > 1) {
      toast.error("Bobot kriteria harus berada di antara 0 dan 1.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        kode_kriteria: form.kode_kriteria.trim().toUpperCase(),
        nama_kriteria: form.nama_kriteria.trim(),
        tipe: form.tipe,
        bobot: parsedBobot,
        keterangan: form.keterangan.trim() || null,
      };
      if (editingCriterion) {
        await updateCriterionApi(editingCriterion.id, payload);
        toast.success("Kriteria berhasil diperbarui.");
      } else {
        await createCriterionApi(payload);
        toast.success("Kriteria baru berhasil ditambahkan.");
      }
      setModalOpen(false);
      fetchCriteria();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menyimpan kriteria."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCriterionApi(deleteTarget.id);
      toast.success(`Kriteria "${deleteTarget.kode_kriteria}" berhasil dihapus.`);
      setDeleteTarget(null);
      fetchCriteria();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menghapus kriteria."));
    } finally {
      setDeleting(false);
    }
  };

  const progressPct = Math.min(100, Math.max(0, criteriaData.total_bobot * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Kriteria &amp; Bobot ARAS
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Atur kriteria penilaian bertipe Benefit atau Cost. Total seluruh bobot wajib tepat{" "}
            <span className="font-semibold text-slate-800">1.0000</span> sebelum kalkulasi.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Tambah Kriteria
        </button>
      </div>

      {/* Indikator Validasi Total Bobot */}
      <div
        className={`rounded-2xl border p-5 shadow-sm ${
          criteriaData.is_valid_weight
            ? "border-emerald-200 bg-emerald-50/70"
            : "border-amber-200 bg-amber-50/80"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {criteriaData.is_valid_weight ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <p
                className={`text-sm font-semibold ${
                  criteriaData.is_valid_weight ? "text-emerald-900" : "text-amber-900"
                }`}
              >
                Total Bobot Saat Ini:{" "}
                <span className="tabular-nums font-bold">
                  {criteriaData.total_bobot.toFixed(4)}
                </span>{" "}
                / 1.0000
              </p>
              <p
                className={`text-xs ${
                  criteriaData.is_valid_weight ? "text-emerald-700" : "text-amber-800"
                }`}
              >
                {criteriaData.is_valid_weight
                  ? "Valid — siap digunakan untuk perhitungan ARAS."
                  : `Selisih terhadap 1.0000: ${
                      criteriaData.weight_difference >= 0 ? "+" : ""
                    }${criteriaData.weight_difference.toFixed(
                      4
                    )}. Sesuaikan bobot agar berjumlah tepat 1.0000.`}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              criteriaData.is_valid_weight
                ? "bg-emerald-600 text-white"
                : "bg-amber-600 text-white"
            }`}
          >
            {criteriaData.is_valid_weight ? "BOBOT VALID" : "PERLU PENYESUAIAN"}
          </span>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/80">
          <div
            className={`h-full rounded-full transition-all ${
              criteriaData.is_valid_weight
                ? "bg-emerald-500"
                : criteriaData.total_bobot > 1.000001
                  ? "bg-rose-500"
                  : "bg-amber-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Tabel Kriteria */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingSpinner label="Memuat daftar kriteria..." />
        ) : criteriaData.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <SlidersHorizontal className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Belum ada kriteria</p>
            <p className="mt-1 text-xs text-slate-500">
              Tambahkan kriteria seperti IPK, Penghasilan Orang Tua, Tanggungan, dan Prestasi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Kode</th>
                  <th className="px-5 py-3.5">Nama Kriteria</th>
                  <th className="px-5 py-3.5">Tipe</th>
                  <th className="px-5 py-3.5">Bobot</th>
                  <th className="px-5 py-3.5">Keterangan</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {criteriaData.items.map((item) => {
                  const guide = getCriterionGuide(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-700">
                        {item.kode_kriteria}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{item.nama_kriteria}</p>
                        {guide.shortLabel !== item.nama_kriteria && (
                          <p className="text-xs text-slate-500">{guide.displayTitle}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={item.tipe} />
                      </td>
                      <td className="px-5 py-3.5 font-mono tabular-nums font-semibold text-slate-800">
                        {Number(item.bobot).toFixed(4)}
                      </td>
                      <td className="max-w-md px-5 py-3.5 text-xs leading-relaxed text-slate-600">
                        <p>{item.keterangan || guide.shortDesc}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{guide.exampleText}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit kriteria"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus kriteria"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Modal Tambah / Edit Kriteria */}
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
                {editingCriterion ? "Edit Kriteria" : "Tambah Kriteria Baru"}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Kode</label>
                  <input
                    type="text"
                    required
                    value={form.kode_kriteria}
                    onChange={(e) => setForm((f) => ({ ...f, kode_kriteria: e.target.value }))}
                    placeholder="C1"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipe</label>
                  <select
                    value={form.tipe}
                    onChange={(e) => setForm((f) => ({ ...f, tipe: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="benefit">Benefit (Makin Besar Baik)</option>
                    <option value="cost">Cost (Makin Kecil Baik)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nama Kriteria
                </label>
                <input
                  type="text"
                  required
                  value={form.nama_kriteria}
                  onChange={(e) => setForm((f) => ({ ...f, nama_kriteria: e.target.value }))}
                  placeholder="Contoh: Indeks Prestasi Kumulatif (IPK)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Bobot (0.0000 - 1.0000)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="1"
                  required
                  value={form.bobot}
                  onChange={(e) => setForm((f) => ({ ...f, bobot: e.target.value }))}
                  placeholder="0.30"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm tabular-nums focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Keterangan / Satuan Input (opsional)
                </label>
                <textarea
                  rows={2}
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Contoh: Skala 0.00 - 4.00 atau Juta Rupiah/bulan"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

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
        title="Hapus Kriteria?"
        message={`Kriteria "${deleteTarget?.kode_kriteria} - ${deleteTarget?.nama_kriteria}" dan seluruh nilai pendaftar untuk kriteria ini akan dihapus.`}
        confirmLabel="Ya, Hapus"
        isLoading={deleting}
      />
    </div>
  );
}

