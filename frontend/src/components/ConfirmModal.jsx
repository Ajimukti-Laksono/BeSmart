import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Aksi",
  message = "Apakah Anda yakin ingin melanjutkan tindakan ini?",
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  variant = "danger",
  isLoading = false,
}) {
  const confirmButtonClass =
    variant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500"
      : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500";

  return (
    <Dialog open={isOpen} onClose={isLoading ? () => {} : onClose} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                variant === "danger" ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold text-slate-900">
                {title}
              </DialogTitle>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{message}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${confirmButtonClass}`}
            >
              {isLoading ? "Memproses..." : confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
