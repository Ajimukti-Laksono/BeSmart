import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getHomePathByRole } from "../../utils/roles";

export default function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuth();
  const backPath = isAuthenticated ? getHomePathByRole(user?.role) : "/login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Akses Ditolak (403)</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Peran akun Anda tidak memiliki izin untuk membuka halaman ini.
      </p>
      <Link
        to={backPath}
        className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}

