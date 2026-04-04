import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { KeyRound } from "lucide-react";

export default function SuperadminInviteRegisterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [token, setToken] = useState(() => searchParams.get("token")?.trim().replace(/\s+/g, "") || "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [info, setInfo] = useState(null);
  const [infoError, setInfoError] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token")?.trim().replace(/\s+/g, "");
    if (!t) {
      setInfoError("Open the link from your approval email, or paste the token below.");
      return;
    }
    setToken(t);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.superadminInviteInfo(t);
        if (!cancelled) setInfo(data);
      } catch (e) {
        if (!cancelled) {
          setInfoError(
            e.response?.data?.message ||
              e.message ||
              "Invalid or expired invitation"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!token.trim()) {
      setError("Token is required");
      return;
    }
    setPending(true);
    try {
      const { data } = await api.superadminInviteComplete(token.trim(), password);
      localStorage.setItem("token", data.token);
      await refresh();
      navigate("/superadmin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed");
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
              Complete superadmin signup
            </h1>
            <p className="text-sm text-slate-500">
              Use the token from your approval email
            </p>
          </div>
        </div>

        {info && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p>
              <span className="font-medium text-slate-900">{info.fullName}</span>
            </p>
            <p className="text-slate-600">{info.email}</p>
            <p className="mt-1 text-xs text-slate-500">{info.organizationName}</p>
          </div>
        )}

        {infoError && !info && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {infoError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Invitation token
            </label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value.trim().replace(/\s+/g, ""))}
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none ring-violet-500 focus:ring-2"
              placeholder="Paste token if the link did not fill it"
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Confirm password
            </label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
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
            {pending ? "Creating account…" : "Create superadmin account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/navigate/superadmin-apply" className="font-medium text-blue-600 hover:underline">
            Request access
          </Link>
          {" · "}
          <Link to="/staff/login" className="font-medium text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
