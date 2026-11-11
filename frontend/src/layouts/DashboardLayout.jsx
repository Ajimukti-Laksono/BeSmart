import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  Award,
  Calculator,
  CalendarRange,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  SlidersHorizontal,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import RoleBadge from "../components/RoleBadge";
import ConfirmModal from "../components/ConfirmModal";

const NAV_BY_ROLE = {
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Manajemen User", icon: Users },
    { to: "/admin/periods", label: "Periode Beasiswa", icon: CalendarRange },
    { to: "/admin/criteria", label: "Kriteria & Bobot", icon: SlidersHorizontal },
    { to: "/admin/aras/calculate", label: "Kalkulasi ARAS", icon: Calculator },
    { to: "/admin/aras/results", label: "Hasil & Laporan", icon: Trophy },
  ],
  panitia: [
    { to: "/panitia/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/panitia/verifikasi", label: "Verifikasi Pendaftar", icon: ClipboardCheck },
    { to: "/panitia/hasil", label: "Hasil Seleksi", icon: Trophy },
  ],
  mahasiswa: [
    { to: "/mahasiswa/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/mahasiswa/pendaftaran", label: "Pendaftaran Beasiswa", icon: FileText },
    { to: "/mahasiswa/pengumuman", label: "Status & Pengumuman", icon: Award },
  ],
};

function SidebarContent({ navItems, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-white">BeasiswaSmart</p>
          <p className="text-[11px] text-slate-400">SPK Metode ARAS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <IconComponent className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4 text-xs text-slate-400">
        <p className="font-medium text-slate-300">BeSmart v1.0</p>
        <p className="mt-0.5">Additive Ratio Assessment</p>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const navItems = NAV_BY_ROLE[user?.role] || [];

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    logout();
    toast.info("Anda telah keluar dari sistem.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 z-30 w-64">
          <SidebarContent navItems={navItems} />
        </div>
      </aside>

      {/* Drawer Sidebar Mobile */}
      <Dialog
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        className="relative z-40 lg:hidden"
      >
        <div className="fixed inset-0 bg-slate-900/60" aria-hidden="true" />
        <div className="fixed inset-0 flex">
          <DialogPanel className="relative flex w-full max-w-xs flex-1 flex-col">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              navItems={navItems}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka navigasi"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <RoleBadge role={user?.role} />
            </div>
          </div>

          <Menu as="div" className="relative">
            <MenuButton className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left transition hover:bg-slate-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="hidden text-xs sm:block">
                <p className="font-semibold text-slate-800">{user?.name}</p>
                <p className="text-slate-500">{user?.email}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </MenuButton>

            <MenuItems
              anchor="bottom end"
              className="z-30 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg focus:outline-none"
            >
              <div className="border-b border-slate-100 px-3 py-2 sm:hidden">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <MenuItem>
                {({ focus }) => (
                  <button
                    type="button"
                    onClick={() => setLogoutModalOpen(true)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 ${
                      focus ? "bg-rose-50" : ""
                    }`}
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Keluar dari BeSmart?"
        message="Sesi Anda akan diakhiri dan Anda perlu login kembali untuk mengakses dashboard."
        confirmLabel="Ya, Keluar"
        variant="danger"
      />
    </div>
  );
}

