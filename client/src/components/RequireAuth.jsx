import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth({ children, roles }) {
  const { admin, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/staff/login" state={{ from: loc }} replace />;
  }

  const role = admin.role || "admin";
  if (roles && !roles.includes(role)) {
    return <Navigate to="/navigate" replace />;
  }

  return children;
}
