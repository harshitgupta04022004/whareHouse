import { getSupabase } from "./supabase-browser";

const API_BASE = "/api";

/**
 * Fetch with Supabase auth token.
 * Automatically attaches the Authorization header.
 */
async function authedFetch(path: string, options: RequestInit = {}) {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      (typeof body.message === "string" && body.message) ||
        (typeof body.error === "string" && body.error) ||
        `Request failed: ${res.status}`,
    );
  }

  return res.json();
}

// ─── Warehouses (onboarding) ──────────────────────────────────────

export async function createWarehouse(data: { name: string; adminName?: string }) {
  return authedFetch("/warehouses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ─── Delivery Orders ──────────────────────────────────────────────

export interface DOListParams {
  cursor?: string;
  limit?: number;
  from?: string;
  to?: string;
  direction?: "IN" | "OUT";
  search?: string;
}

export async function listDOs(params: DOListParams = {}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.direction) qs.set("direction", params.direction);
  if (params.search) qs.set("search", params.search);

  return authedFetch(`/do?${qs.toString()}`);
}

export async function createDO(data: Record<string, unknown>) {
  return authedFetch("/do", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateDO(id: string, data: Record<string, unknown>, updatedAt?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (updatedAt) headers["x-record-updated-at"] = updatedAt;

  return authedFetch(`/do?id=${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
}

export async function deleteDO(id: string) {
  return authedFetch(`/do?id=${id}`, { method: "DELETE" });
}

// ─── Items ────────────────────────────────────────────────────────

export async function listItems(params: { cursor?: string; limit?: number; search?: string; totals?: boolean } = {}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.totals) qs.set("totals", "true");
  return authedFetch(`/items?${qs.toString()}`);
}

export async function createItem(data: { name: string; bag_size: number }) {
  return authedFetch("/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateItem(id: string, data: Record<string, unknown>) {
  return authedFetch(`/items?id=${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteItem(id: string) {
  return authedFetch(`/items?id=${id}`, { method: "DELETE" });
}

// ─── Parties ──────────────────────────────────────────────────────

export async function listParties(params: { cursor?: string; limit?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  return authedFetch(`/parties?${qs.toString()}`);
}

export async function createParty(data: { name: string }) {
  return authedFetch("/parties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateParty(id: string, data: Record<string, unknown>) {
  return authedFetch(`/parties?id=${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ party_id: id, ...data }),
  });
}

export async function deleteParty(id: string) {
  return authedFetch(`/parties?id=${id}`, { method: "DELETE" });
}

// ─── Dashboard ────────────────────────────────────────────────────

export async function getDashboard(from: string, to: string) {
  const qs = new URLSearchParams({ from, to });
  return authedFetch(`/dashboard?${qs.toString()}`);
}

// ─── Users ────────────────────────────────────────────────────────

export async function listUsers() {
  return authedFetch("/users");
}

export async function inviteUser(data: { email: string; name: string; role: string }) {
  return authedFetch("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateUserRole(userId: string, role: string) {
  return authedFetch(`/users?id=${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export async function removeUser(userId: string) {
  return authedFetch(`/users?id=${userId}`, { method: "DELETE" });
}

// ─── Audit ────────────────────────────────────────────────────────

export async function listAuditLog(params: { cursor?: string; limit?: number; action?: string; entity?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("offset", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.action) qs.set("action", params.action);
  if (params.entity) qs.set("entity", params.entity);
  return authedFetch(`/audit?${qs.toString()}`);
}

export async function verifyAuditIntegrity() {
  return authedFetch("/audit/integrity");
}

export async function logLoginAudit() {
  return authedFetch("/auth/session", {
    method: "POST",
  });
}

export async function logLogoutAudit() {
  return authedFetch("/auth/session", {
    method: "DELETE",
  });
}

// ─── Files ────────────────────────────────────────────────────────

export async function uploadFile(formData: FormData) {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/files`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      (typeof body.message === "string" && body.message) ||
        (typeof body.error === "string" && body.error) ||
        `Upload failed: ${res.status}`,
    );
  }

  return res.json();
}

export async function deleteFile(id: string) {
  return authedFetch(`/files?id=${id}`, { method: "DELETE" });
}
