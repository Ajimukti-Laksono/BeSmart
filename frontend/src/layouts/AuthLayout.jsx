import { GraduationCap, ShieldCheck, Calculator, Award } from "lucide-react";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      {/* Panel Branding Kiri */}
      <div className="hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-10 text-white lg:flex lg:w-5/12 lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <GraduationCap className="h-6 w-6 text-indigo-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">BeasiswaSmart</h1>
              <p className="text-xs text-indigo-200">Sistem Pendukung Keputusan BeSmart</p>
            </div>
          </div>

          <div className="mt-14 max-w-md space-y-4">
            <span className="inline-flex items-center rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-white/20">
              Metode ARAS (Additive Ratio Assessment)
            </span>
            <h2 className="text-3xl font-bold leading-tight">
              Seleksi Penerima Beasiswa Objektif, Transparan, dan Terukur
            </h2>
            <p className="text-sm leading-relaxed text-indigo-100/85">
              Mengelola pendaftaran mahasiswa, verifikasi berkas panitia, hingga perhitungan
              peringkat dan kelulusan berbasis rasio utilitas optimal K<sub>i</sub> secara otomatis.
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/15 pt-8 sm:grid-cols-3">
          <div className="space-y-1">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <p className="text-xs font-semibold">Verifikasi Ketat</p>
            <p className="text-[11px] text-indigo-200/80">Validasi berkas oleh panitia</p>
          </div>
          <div className="space-y-1">
            <Calculator className="h-5 w-5 text-amber-300" />
            <p className="text-xs font-semibold">Audit Step-by-Step</p>
            <p className="text-[11px] text-indigo-200/80">Matriks A0, R, D, Si & Ki</p>
          </div>
          <div className="space-y-1">
            <Award className="h-5 w-5 text-sky-300" />
            <p className="text-xs font-semibold">Laporan Instan</p>
            <p className="text-[11px] text-indigo-200/80">Ekspor rekap PDF & Excel</p>
          </div>
        </div>
      </div>

      {/* Panel Form Kanan */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-6 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900">BeasiswaSmart</span>
            <p className="text-xs text-slate-500">SPK Beasiswa Metode ARAS</p>
          </div>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
