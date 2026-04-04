import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  login: (email, password) =>
    client.post("/api/auth/login", { email, password }),
  register: (body) => client.post("/api/auth/register", body),
  me: () => client.get("/api/auth/me"),
  compounds: () => client.get("/api/compounds"),
  compound: (id) => client.get(`/api/compounds/${id}`),
  destinations: (id) => client.get(`/api/compounds/${id}/destinations`),
  mapPayload: (id) => client.get(`/api/compounds/${id}/map`),
  outdoorProgress: (body) =>
    client.post("/api/navigation/outdoor-progress", body),
  outdoorRoute: (body) => client.post("/api/navigation/outdoor-route", body),
  chatQuery: (body) => client.post("/api/chat/query", body),
  myCompounds: () => client.get("/api/compounds/my"),
  updateCompound: (id, data) => client.put(`/api/compounds/${id}`, data),
  createCompound: (data) => client.post("/api/compounds", data),
  deleteCompound: (id) => client.delete(`/api/compounds/${id}`),
  superadminSetup: (setupKey, body) =>
    client.post("/api/superadmin/setup", body, {
      headers: { "X-Setup-Key": setupKey },
    }),
  superadminCompounds: () => client.get("/api/superadmin/compounds"),
  superadminAdmins: () => client.get("/api/superadmin/admins"),
  superadminCreateAdmin: (body) => client.post("/api/superadmin/admins", body),
  superadminAssign: (compoundId, adminId) =>
    client.put(`/api/superadmin/compounds/${compoundId}/assign`, { adminId }),

  submitSuperadminApplication: async (formData) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/superadmin/applications`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Could not submit application");
    }
    return data;
  },

  superadminInviteInfo: (token) =>
    client.get("/api/superadmin/invite/info", { params: { token } }),

  superadminInviteComplete: (token, password) =>
    client.post("/api/superadmin/invite/complete", { token, password }),

  superadminApplications: () => client.get("/api/superadmin/applications"),

  superadminApproveApplication: (id) =>
    client.post(`/api/superadmin/applications/${id}/approve`),

  superadminRejectApplication: (id, reason) =>
    client.post(`/api/superadmin/applications/${id}/reject`, { reason }),

  async downloadSuperadminApplicationFile(appId, storedName, downloadName) {
    const token = localStorage.getItem("token");
    const res = await fetch(
      `${import.meta.env.VITE_API_URL ?? ""}/api/superadmin/applications/${appId}/files/${encodeURIComponent(storedName)}`,
      { headers: { Authorization: token ? `Bearer ${token}` : "" } }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Download failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName || "document";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export default client;
