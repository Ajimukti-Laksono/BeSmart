import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getHomePathByRole } from "../utils/roles";
import LoadingSpinner from "./LoadingSpinner";

export default function GuestRoute() {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner label="Memuat aplikasi..." />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getHomePathByRole(user.role)} replace />;
  }

  return <Outlet />;
}

