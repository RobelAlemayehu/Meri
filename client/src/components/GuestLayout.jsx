import { Link, NavLink, Outlet } from "react-router-dom";
import { MapPin } from "lucide-react";
import { BRAND_NAME, BRAND_TAGLINE, LOGO_SRC } from "../constants/brand";

/**
 * Public guest shell — no login / signup. Staff use /staff/login (not linked here).
 */
export default function GuestLayout() {
  const navCls = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-[#1e3a5f] text-amber-100"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0c1524] shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to="/navigate"
            className="flex items-center gap-3"
          >
            <img
              src={LOGO_SRC}
              alt=""
              className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-lg ring-2 ring-amber-200/30"
            />
            <div>
              <p className="text-lg font-bold tracking-tight text-white">
                {BRAND_NAME}
              </p>
              <p className="text-xs text-slate-400">{BRAND_TAGLINE}</p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/navigate" end className={navCls}>
              Home
            </NavLink>
            <NavLink to="/navigate/guide" className={navCls}>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Navigate
              </span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
