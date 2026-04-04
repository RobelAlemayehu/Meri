import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { KeyRound } from "lucide-react";

export default function SuperadminSetupPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [setupKey, setSetupKey] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const { data } = await api.superadminSetup(setupKey, {
        name,
        email,
        password,
      });
      localStorage.setItem("token", data.token);
      await refresh();
      navigate("/superadmin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Setup failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Superadmin setup
            </h1>
            <p className="text-sm text-slate-500">
              Requires{" "}
              <code className="rounded bg-slate-100 px-1 text-violet-700">
                SUPERADMIN_SETUP_KEY
              </code>{" "}
              on the server
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
              X-Setup-Key (from server .env)
            </label>
            <input
              type="password"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none ring-violet-500 focus:ring-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-violet-500 focus:ring-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-violet-500 focus:ring-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-violet-500 focus:ring-2"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-violet-600 py-2.5 font-medium text-white shadow-sm hover:bg-violet-500 disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create superadmin"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            to="/staff/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Already have an account?
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-slate-500">
          Need org approval first?{" "}
          <Link
            to="/navigate/superadmin-apply"
            className="font-medium text-violet-600 hover:underline"
          >
            Apply for superadmin access
          </Link>
        </p>
      </div>
    </div>
  );
}
