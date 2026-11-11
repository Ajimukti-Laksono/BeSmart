import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { useAuth } from "./hooks/useAuth";
import { getHomePathByRole } from "./utils/roles";
import GuestRoute from "./components/GuestRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import RoleDashboardPage from "./pages/dashboards/RoleDashboardPage";
import UsersPage from "./pages/admin/UsersPage";
import PeriodsPage from "./pages/admin/PeriodsPage";
import CriteriaPage from "./pages/admin/CriteriaPage";
import ArasCalculatePage from "./pages/admin/ArasCalculatePage";
import ArasResultsPage from "./pages/aras/ArasResultsPage";
import VerificationPage from "./pages/panitia/VerificationPage";
import RegistrationPage from "./pages/mahasiswa/RegistrationPage";
import ApplicationStatusPage from "./pages/mahasiswa/ApplicationStatusPage";
import UnauthorizedPage from "./pages/errors/UnauthorizedPage";
import NotFoundPage from "./pages/errors/NotFoundPage";

function RootRedirect() {
  const { isAuthenticated, isInitializing, user } = useAuth();
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner label="Memuat BeSmart..." />
      </div>
    );
  }
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomePathByRole(user.role)} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<RootRedirect />} />

              {/* Rute Tamu (Hanya jika belum login) */}
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Rute Khusus Admin */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin/dashboard" element={<RoleDashboardPage />} />
                  <Route path="/admin/users" element={<UsersPage />} />
                  <Route path="/admin/periods" element={<PeriodsPage />} />
                  <Route path="/admin/criteria" element={<CriteriaPage />} />
                  <Route path="/admin/aras/calculate" element={<ArasCalculatePage />} />
                  <Route path="/admin/aras/results" element={<ArasResultsPage />} />
                </Route>
              </Route>

              {/* Rute Khusus Panitia */}
              <Route element={<ProtectedRoute allowedRoles={["panitia"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/panitia/dashboard" element={<RoleDashboardPage />} />
                  <Route path="/panitia/verifikasi" element={<VerificationPage />} />
                  <Route path="/panitia/hasil" element={<ArasResultsPage />} />
                </Route>
              </Route>

              {/* Rute Khusus Mahasiswa */}
              <Route element={<ProtectedRoute allowedRoles={["mahasiswa"]} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/mahasiswa/dashboard" element={<RoleDashboardPage />} />
                  <Route path="/mahasiswa/pendaftaran" element={<RegistrationPage />} />
                  <Route path="/mahasiswa/pengumuman" element={<ApplicationStatusPage />} />
                </Route>
              </Route>

              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
