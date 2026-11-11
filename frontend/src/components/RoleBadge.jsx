import { ROLE_META } from "../utils/roles";

export default function RoleBadge({ role }) {
  const meta = ROLE_META[role] || {
    label: role || "-",
    badgeClass: "bg-slate-100 text-slate-700 ring-slate-500/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

