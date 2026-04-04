import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import GuestLayout from "./components/GuestLayout";
import StaffLayout from "./components/StaffLayout";
import { RequireAuth } from "./components/RequireAuth";
import LandingPage from "./pages/LandingPage";
import UserNavigate from "./pages/UserNavigate";
import LoginPage from "./pages/LoginPage";
import SuperadminSetupPage from "./pages/SuperadminSetupPage";
import SuperadminApplyPage from "./pages/SuperadminApplyPage";
import SuperadminInviteRegisterPage from "./pages/SuperadminInviteRegisterPage";
import AdminDashboard from "./pages/AdminDashboard";
import SuperadminDashboard from "./pages/SuperadminDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Navigate to="/staff/login" replace />} />
          <Route path="/staff/login" element={<LoginPage />} />
          <Route path="/setup" element={<SuperadminSetupPage />} />
          <Route
            path="/superadmin/register-invite"
            element={<SuperadminInviteRegisterPage />}
          />

          <Route element={<GuestLayout />}>
            <Route path="/navigate" element={<LandingPage />} />
            <Route path="/navigate/guide" element={<UserNavigate />} />
            <Route
              path="/navigate/superadmin-apply"
              element={<SuperadminApplyPage />}
            />
          </Route>

          <Route element={<StaffLayout />}>
            <Route
              path="/admin"
              element={
                <RequireAuth roles={["admin", "superadmin"]}>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/superadmin"
              element={
                <RequireAuth roles={["superadmin"]}>
                  <SuperadminDashboard />
                </RequireAuth>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to="/navigate" replace />} />
          <Route path="*" element={<Navigate to="/navigate" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
