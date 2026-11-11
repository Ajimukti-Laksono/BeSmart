const BADGE_MAP = {
  // Status Verifikasi
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  verified: { label: "Verified", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-700 ring-rose-600/20" },

  // Status Periode
  buka: { label: "Dibuka", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  proses: { label: "Diproses", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  selesai: { label: "Selesai", cls: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },

  // Tipe Kriteria
  benefit: { label: "Benefit", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  cost: { label: "Cost", cls: "bg-amber-50 text-amber-700 ring-amber-600/20" },

  // Kelulusan ARAS
  lolos: { label: "Lolos", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  tidak_lolos: { label: "Tidak Lolos", cls: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

export default function StatusBadge({ status, customLabel }) {
  const config = BADGE_MAP[status] || {
    label: status || "-",
    cls: "bg-slate-100 text-slate-700 ring-slate-500/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${config.cls}`}
    >
      {customLabel || config.label}
    </span>
  );
}

