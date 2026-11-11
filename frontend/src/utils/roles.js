export const ROLE_META = {
  admin: {
    label: "Admin / Pimpinan",
    badgeClass: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    homePath: "/admin/dashboard",
  },
  panitia: {
    label: "Panitia Verifikator",
    badgeClass: "bg-amber-50 text-amber-700 ring-amber-600/20",
    homePath: "/panitia/dashboard",
  },
  mahasiswa: {
    label: "Mahasiswa",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    homePath: "/mahasiswa/dashboard",
  },
};

export function getHomePathByRole(role) {
  return ROLE_META[role]?.homePath || "/login";
}

export function getRoleLabel(role) {
  return ROLE_META[role]?.label || role || "-";
}

