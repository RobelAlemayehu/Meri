import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Building2, FileUp, Shield, ArrowLeft } from "lucide-react";

export default function SuperadminApplyPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  function onFilesChange(e) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (files.length === 0) {
      setError("Add at least one legal document (PDF or image).");
      return;
    }
    setPending(true);
    try {
      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("email", email.trim());
      formData.append("organizationName", organizationName.trim());
      files.forEach((f) => formData.append("legalDocuments", f));
      await api.submitSuperadminApplication(formData);
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not submit application");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Application sent
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          A superadmin will review your organization and documents. If approved,
          you&apos;ll get an email with a registration link and a one-time token
          to create your account.
        </p>
        <Link
          to="/navigate"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        to="/navigate"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Superadmin access
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Request an account for your organization. Upload legal proof; after
              approval you&apos;ll receive an email to finish signup.
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
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Your name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-violet-500 focus:ring-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Work email
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
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Building2 className="h-4 w-4 text-slate-500" />
              Organization name
            </label>
            <input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="e.g. University, hospital group, company"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-violet-500 focus:ring-2"
              required
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <FileUp className="h-4 w-4 text-slate-500" />
              Legal documents
            </label>
            <p className="mb-2 text-xs text-slate-500">
              Registration certificate, tax ID, or other proof (PDF or images, up
              to 5 files, 10 MB each).
            </p>
            <input
              type="file"
              name="legalDocuments"
              accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={onFilesChange}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-violet-800 hover:file:bg-violet-100"
            />
            {files.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                {files.length} file{files.length === 1 ? "" : "s"} selected
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-violet-600 py-2.5 font-medium text-white shadow-sm hover:bg-violet-500 disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit application"}
          </button>
        </form>

        <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          Already have a setup key?{" "}
          <Link to="/setup" className="font-medium text-violet-600 hover:underline">
            Classic setup
          </Link>
          {" · "}
          <Link
            to="/staff/login"
            className="font-medium text-slate-600 hover:underline"
          >
            Staff login
          </Link>
        </p>
      </div>
    </div>
  );
}
