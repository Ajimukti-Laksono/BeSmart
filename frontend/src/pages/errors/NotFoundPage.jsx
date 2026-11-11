import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { getHomePathByRole } from "../../utils/roles";

export default function NotFoundPage() {
  const { user, isAuthenticated } = useAuth();
  const backPath = isAuthenticated ? getHomePathByRole(user?.role) : "/login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Halaman Tidak Ditemukan (404)</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Alamat URL yang Anda buka tidak tersedia atau telah dipindahkan.
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

