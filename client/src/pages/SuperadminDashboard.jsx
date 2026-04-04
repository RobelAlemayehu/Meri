import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Building2,
  UserPlus,
  Link2,
  ClipboardList,
  Check,
  X,
  Download,
} from "lucide-react";

export default function SuperadminDashboard() {
  const [compounds, setCompounds] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [newCompoundName, setNewCompoundName] = useState("");
  const [newCompoundDesc, setNewCompoundDesc] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [assignCompoundId, setAssignCompoundId] = useState("");
  const [assignAdminId, setAssignAdminId] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const [c, a, app] = await Promise.all([
        api.superadminCompounds(),
        api.superadminAdmins(),
        api.superadminApplications(),
      ]);
      setCompounds(c.data.compounds || []);
      setAdmins(a.data.admins || []);
      setApplications(app.data.applications || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load data");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createCompound(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createCompound({
        name: newCompoundName.trim(),
        description: newCompoundDesc.trim(),
        buildings: [],
      });
      setNewCompoundName("");
      setNewCompoundDesc("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create compound");
    } finally {
      setBusy(false);
    }
  }

  async function createAdmin(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.superadminCreateAdmin({
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword,
      });
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create admin");
    } finally {
      setBusy(false);
    }
  }

  async function assign(e) {
    e.preventDefault();
    if (!assignCompoundId || !assignAdminId) return;
    setBusy(true);
    setError("");
    try {
      await api.superadminAssign(assignCompoundId, assignAdminId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function approveApplication(id) {
    if (!window.confirm("Approve and email a registration link to the applicant?")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.superadminApproveApplication(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function rejectApplication(id) {
    const reason = window.prompt("Optional reason (shown internally only):") ?? "";
    setBusy(true);
    setError("");
    try {
      await api.superadminRejectApplication(id, reason);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadDoc(appId, storedName, originalName) {
    setError("");
    try {
      await api.downloadSuperadminApplicationFile(appId, storedName, originalName);
    } catch (err) {
      setError(err.message || "Download failed");
    }
  }

  const pendingApps = applications.filter((x) => x.status === "pending");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Superadmin
        </h1>
        <p className="mt-1 text-slate-600">
          Create branches (compounds), branch admins, and assign who manages
          each site.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 font-medium text-slate-900">
          <ClipboardList className="h-5 w-5 text-violet-600" />
          Superadmin applications
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Review requests from the landing page. Approve to email a one-time
          registration link and token.
        </p>
        {applications.length === 0 ? (
          <p className="text-sm text-slate-500">No applications yet.</p>
        ) : (
          <ul className="space-y-4">
            {applications.map((app) => (
              <li
                key={app._id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{app.fullName}</p>
                    <p className="text-sm text-slate-600">{app.email}</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {app.organizationName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(app.createdAt).toLocaleString()} ·{" "}
                      <span
                        className={
                          app.status === "pending"
                            ? "font-medium text-amber-700"
                            : app.status === "approved"
                              ? "font-medium text-sky-700"
                              : app.status === "registered"
                                ? "font-medium text-emerald-700"
                                : "font-medium text-slate-600"
                        }
                      >
                        {app.status}
                      </span>
                    </p>
                    {app.status === "rejected" && app.rejectionReason && (
                      <p className="mt-1 text-xs text-slate-500">
                        Note: {app.rejectionReason}
                      </p>
                    )}
                  </div>
                  {app.status === "pending" && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => approveApplication(app._id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => rejectApplication(app._id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                {app.legalDocuments?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200/80 pt-3">
                    {app.legalDocuments.map((doc) => (
                      <button
                        key={doc.storedName}
                        type="button"
                        onClick={() =>
                          downloadDoc(app._id, doc.storedName, doc.originalName)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50"
                      >
                        <Download className="h-3 w-3" />
                        {doc.originalName}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {pendingApps.length > 0 && (
          <p className="mt-3 text-xs text-amber-800">
            {pendingApps.length} pending — configure SMTP in server{" "}
            <code className="rounded bg-amber-100 px-1">.env</code> to email
            invites automatically; otherwise copy the link from server logs after
            approve.
          </p>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
            <Building2 className="h-5 w-5 text-violet-600" />
            New compound
          </h2>
          <form onSubmit={createCompound} className="space-y-3">
            <input
              placeholder="Compound name"
              value={newCompoundName}
              onChange={(e) => setNewCompoundName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              required
            />
            <input
              placeholder="Description (optional)"
              value={newCompoundDesc}
              onChange={(e) => setNewCompoundDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-violet-600 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-500 disabled:opacity-50"
            >
              Create compound
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            New branch admin
          </h2>
          <form onSubmit={createAdmin} className="space-y-3">
            <input
              placeholder="Name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              required
            />
            <input
              type="password"
              placeholder="Password (min 6)"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              Create admin
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
            <Link2 className="h-5 w-5 text-sky-600" />
            Assign admin → compound
          </h2>
          <form onSubmit={assign} className="space-y-3">
            <select
              value={assignCompoundId}
              onChange={(e) => setAssignCompoundId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              required
            >
              <option value="">Select compound</option>
              {compounds.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={assignAdminId}
              onChange={(e) => setAssignAdminId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              required
            >
              <option value="">Select branch admin</option>
              {admins.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-sky-600 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
            >
              Assign
            </button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-medium text-slate-900">Compounds</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {compounds.map((c) => (
              <li
                key={c._id}
                className="flex justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="text-xs text-slate-500">
                  {c.assignedAdmin?.email || "— unassigned —"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-medium text-slate-900">Branch admins</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            {admins.map((a) => (
              <li
                key={a._id}
                className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-slate-900"
              >
                {a.name}{" "}
                <span className="text-slate-500">({a.email})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
