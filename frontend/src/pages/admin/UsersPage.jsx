import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Pencil, Plus, Search, Trash2, Users as UsersIcon, X } from "lucide-react";
import {
  createUserApi,
  deleteUserApi,
  getUsersApi,
  updateUserApi,
} from "../../api/users";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../utils/error";
import LoadingSpinner from "../../components/LoadingSpinner";
import RoleBadge from "../../components/RoleBadge";
import ConfirmModal from "../../components/ConfirmModal";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "mahasiswa",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const data = await getUsersApi(params);
      setUsers(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memuat daftar pengguna."));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (target) => {
    setEditingUser(target);
    setForm({
      name: target.name,
      email: target.email,
      password: "",
      role: target.role,
    });
    setModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Nama minimal 2 karakter.");
      return;
    }
    if (!editingUser && form.password.length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }
    if (editingUser && form.password && form.password.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await updateUserApi(editingUser.id, payload);
        toast.success("Data pengguna berhasil diperbarui.");
      } else {
        await createUserApi({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });
        toast.success("Pengguna baru berhasil ditambahkan.");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menyimpan data pengguna."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserApi(deleteTarget.id);
      toast.success(`Pengguna "${deleteTarget.name}" berhasil dihapus.`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menghapus pengguna."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen User</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola akun Admin, Panitia Verifikator, dan Mahasiswa BeSmart.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Tambah User
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="">Semua Peran</option>
          <option value="admin">Admin</option>
          <option value="panitia">Panitia</option>
          <option value="mahasiswa">Mahasiswa</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingSpinner label="Memuat daftar pengguna..." />
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <UsersIcon className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Belum ada data pengguna</p>
            <p className="mt-1 text-xs text-slate-500">
              Ubah filter pencarian atau tambahkan pengguna baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Nama</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Peran</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((item) => {
                  const isSelf = item.id === currentUser?.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        {item.name}
                        {isSelf && (
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            Anda
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{item.email}</td>
                      <td className="px-5 py-3.5">
                        <RoleBadge role={item.role} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit pengguna"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(item)}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title={isSelf ? "Tidak dapat menghapus akun sendiri" : "Hapus pengguna"}
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

      {/* Create/Edit Modal */}
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
                {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Peran</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="mahasiswa">Mahasiswa</option>
                  <option value="panitia">Panitia Verifikator</option>
                  <option value="admin">Admin / Pimpinan</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {editingUser ? "Password Baru (opsional)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingUser ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
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
        title="Hapus Pengguna?"
        message={`Akun "${deleteTarget?.name}" (${deleteTarget?.email}) akan dihapus permanen beserta data terkaitnya.`}
        confirmLabel="Ya, Hapus"
        isLoading={deleting}
      />
    </div>
  );
}
