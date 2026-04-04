import { Link, NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Shield, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BRAND_NAME, LOGO_SRC } from "../constants/brand";

/**
 * Staff-only shell for /admin and /superadmin. Not used on public guest routes.
 */
export default function StaffLayout() {
  const { admin, logout } = useAuth();
  const role = admin?.role || "admin";

  const linkCls = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-blue-500/15 text-blue-400"
        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800/80 bg-[#0B0E14] lg:flex">
        <div className="border-b border-slate-800/80 px-4 py-5">
          <Link to="/admin" className="flex items-start gap-3">
            <img
              src={LOGO_SRC}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-2 ring-amber-200/20"
            />
            <div>
              <p className="text-base font-bold tracking-tight text-white">
                {BRAND_NAME}
              </p>
              <p className="text-xs text-amber-200/80">Staff</p>
            </div>
          </Link>
        </div>

        {admin && (
          <div className="px-4 py-4">
            <div className="rounded-xl bg-gradient-to-r from-violet-600/90 to-indigo-600/90 px-3 py-2.5 shadow-lg shadow-indigo-900/30">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/80">
                {role === "superadmin" ? "Superadmin" : "Admin"}
              </p>
              <p className="truncate text-sm font-semibold text-white">
                {admin.name}
              </p>
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-4">
          {admin && (role === "admin" || role === "superadmin") && (
            <NavLink to="/admin" className={linkCls}>
              <LayoutDashboard className="h-5 w-5 shrink-0" strokeWidth={2} />
              My compound
            </NavLink>
          )}
          {admin && role === "superadmin" && (
            <NavLink to="/superadmin" className={linkCls}>
              <Shield className="h-5 w-5 shrink-0" strokeWidth={2} />
              Superadmin
            </NavLink>
          )}
        </nav>

        <div className="mt-auto border-t border-slate-800/80 px-4 py-4">
          <Link
            to="/navigate"
            className="mb-3 block text-center text-[11px] text-slate-500 hover:text-slate-300"
          >
            Open guest app →
          </Link>
          {admin && (
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          )}
          <p className="mt-3 text-center text-[10px] text-slate-600">
            {BRAND_NAME} staff · v1
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Link to="/admin" className="flex items-center gap-2 font-bold text-slate-900">
            <img src={LOGO_SRC} alt="" className="h-8 w-8 rounded-md object-cover" />
            {BRAND_NAME}
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-2 text-xs font-medium">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `rounded-lg px-2 py-1 ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600"}`
              }
            >
              Admin
            </NavLink>
            {role === "superadmin" && (
              <NavLink
                to="/superadmin"
                className={({ isActive }) =>
                  `rounded-lg px-2 py-1 ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600"}`
                }
              >
                Super
              </NavLink>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-lg px-2 py-1 text-slate-500"
            >
              Out
            </button>
          </nav>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
