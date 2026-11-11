export default function LoadingSpinner({ label = "Memuat data..." }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-slate-500">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

