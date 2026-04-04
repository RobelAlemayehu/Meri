import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const user = await login(email, password);
      const role = user.role || "admin";
      if (role === "superadmin") {
        navigate("/superadmin", { replace: true });
      } else {
        navigate(
          from.startsWith("/staff/login") ? "/admin" : from,
          { replace: true }
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white shadow-md shadow-blue-500/25">
            <LogIn className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              መሪ · Staff sign-in
            </h1>
            <p className="text-sm text-slate-500">
              Branch admins & superadmin only — not for guests
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-blue-600 py-2.5 font-medium text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          First superadmin?{" "}
          <Link to="/setup" className="font-medium text-blue-600 hover:underline">
            Setup with server key
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          <Link to="/navigate" className="text-slate-600 hover:text-slate-900">
            ← Guest home (no login)
          </Link>
        </p>
      </div>
    </div>
  );
}
