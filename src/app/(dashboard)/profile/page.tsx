"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getProfile, updateProfile } from "@/lib/api-client";

interface ProfileData {
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  warehouse_name: string;
}

interface Stats {
  do_count: number;
  in_count: number;
  out_count: number;
  bags: number;
  weight: number;
  login_count: number;
  last_activity: string;
}

interface DORow {
  do_id: string;
  do_number: string;
  direction: "IN" | "OUT";
  date: string;
  item_count: number;
  party_name: string | null;
  do_items?: Array<{ bags: number; total_weight: number }>;
}

interface AuditEntry {
  log_id: number;
  entity: string;
  entity_id: string | null;
  action: string;
  ip_address: string | null;
  timestamp: string;
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-500/15 text-purple-400",
  manager: "bg-blue-500/15 text-blue-400",
  staff: "bg-green-500/15 text-green-400",
};

const actionColors: Record<string, string> = {
  create: "bg-green-500/15 text-green-400",
  update: "bg-blue-500/15 text-blue-400",
  delete: "bg-red-500/15 text-red-400",
  login: "bg-purple-500/15 text-purple-400",
  logout: "bg-yellow-500/15 text-yellow-400",
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function ProfilePage() {
  const { user, refreshUser, signOut } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dos, setDos] = useState<DORow[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "dos" | "activity">("overview");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getProfile();
        if (cancelled) return;
        setProfile(data.profile);
        setStats(data.stats);
        setDos(data.dos ?? []);
        setLogs(data.logs ?? []);
        setNameValue(data.profile?.name ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim().length < 2) {
      setSaveMsg("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      await updateProfile({ name: nameValue.trim() });
      setProfile((prev) => (prev ? { ...prev, name: nameValue.trim() } : prev));
      setEditingName(false);
      setSaveMsg("Name updated.");
      await refreshUser();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[13px] text-ink-faint">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile || !stats) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[var(--radius-card)] border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
          {error || "Profile not found"}
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-[12px] text-ink-faint mb-6">
        <span
          className="hover:text-ink-soft cursor-pointer transition-colors"
          onClick={() => router.push("/challans")}
        >
          DOs
        </span>
        <span className="mx-2">/</span>
        <span className="text-ink-soft">Profile</span>
      </div>

      {/* Profile card */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center text-[20px] font-bold text-brand-ink shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="focus-ring h-9 min-w-[160px] flex-1 rounded-[9px] border border-border bg-surface-2 px-3 text-[14px] text-ink"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="h-9 px-3 rounded-[9px] bg-brand text-brand-ink text-[12px] font-semibold disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameValue(profile.name);
                    setSaveMsg("");
                  }}
                  className="h-9 px-3 text-[12px] text-ink-faint hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-display text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-ink">
                  {profile.name}
                </h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-[11px] font-medium text-brand hover:underline"
                >
                  Edit name
                </button>
              </div>
            )}
            {saveMsg && (
              <p className="text-[12px] text-ink-soft mb-2">{saveMsg}</p>
            )}
            <p className="text-[13px] text-ink-soft">{profile.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg capitalize ${
                  roleColors[profile.role] || "bg-white/10 text-ink-soft"
                }`}
              >
                {profile.role}
              </span>
              <span className="text-[11px] text-ink-faint">
                {profile.warehouse_name}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-border">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Member since
            </div>
            <div className="text-[13px] text-ink mt-0.5">{formatDate(profile.created_at)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Last activity
            </div>
            <div className="text-[13px] text-ink mt-0.5">{formatDate(stats.last_activity)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Link
            href="/forgot-password"
            className="inline-flex h-9 items-center px-3 rounded-[9px] border border-border text-[12px] font-medium text-ink-soft hover:text-ink hover:bg-white/5 transition-colors"
          >
            Change password
          </Link>
          <button
            onClick={signOut}
            className="inline-flex h-9 items-center px-3 rounded-[9px] border border-border text-[12px] font-medium text-ink-soft hover:text-ink hover:bg-white/5 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="rounded-[12px] border border-border bg-surface px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">My DOs</div>
          <div className="text-[20px] font-bold text-ink mt-0.5">{stats.do_count}</div>
          <div className="text-[11px] text-ink-faint">
            {stats.in_count} IN · {stats.out_count} OUT
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Bags</div>
          <div className="text-[20px] font-bold text-ink mt-0.5">{stats.bags}</div>
          <div className="text-[11px] text-ink-faint">in my DOs</div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Weight</div>
          <div className="text-[20px] font-bold text-ink mt-0.5">{stats.weight}</div>
          <div className="text-[11px] text-ink-faint">kg total</div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Logins</div>
          <div className="text-[20px] font-bold text-ink mt-0.5">{stats.login_count}</div>
          <div className="text-[11px] text-ink-faint">recorded</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-border overflow-x-auto">
        {(
          [
            ["overview", "Overview"],
            ["dos", `My DOs (${dos.length})`],
            ["activity", `Activity (${logs.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 px-3 py-2 text-[13px] font-semibold border-b-2 transition-colors ${
              tab === key
                ? "border-brand text-ink"
                : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-[14px] font-semibold text-ink mb-2">Account details</h2>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
                <dt className="text-ink-faint">Full name</dt>
                <dd className="text-ink font-medium text-right">{profile.name}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
                <dt className="text-ink-faint">Email</dt>
                <dd className="text-ink font-medium text-right break-all">{profile.email}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
                <dt className="text-ink-faint">Role</dt>
                <dd className="text-ink font-medium text-right capitalize">{profile.role}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-border/50 pb-2">
                <dt className="text-ink-faint">Warehouse</dt>
                <dd className="text-ink font-medium text-right">{profile.warehouse_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">User ID</dt>
                <dd className="text-ink-faint font-mono text-[11px] text-right truncate max-w-[180px]">
                  {profile.user_id}
                </dd>
              </div>
            </dl>
          </div>
          <p className="text-[12px] text-ink-faint">
            This profile shows your own delivery orders and activity in this warehouse.
          </p>
        </div>
      )}

      {tab === "dos" && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
          {dos.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-ink-faint">
              You haven&apos;t created any delivery orders yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {dos.map((row) => {
                const bags = (row.do_items ?? []).reduce((s, i) => s + (i.bags ?? 0), 0);
                const weight = (row.do_items ?? []).reduce((s, i) => s + (i.total_weight ?? 0), 0);
                return (
                  <button
                    key={row.do_id}
                    onClick={() => router.push(`/challans/${row.do_id}`)}
                    className="w-full text-left px-4 sm:px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-ink">
                            {row.party_name || "No party"}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              row.direction === "IN"
                                ? "bg-green-500/15 text-green-400"
                                : "bg-orange-500/15 text-orange-400"
                            }`}
                          >
                            {row.direction}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink-faint mt-0.5">
                          DO: {row.do_number} · {row.date}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-ink-soft shrink-0">
                        <div>{row.item_count} items</div>
                        <div>
                          {bags} bags · {weight} kg
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
          {logs.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-ink-faint">
              No activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((entry) => (
                <div key={entry.log_id} className="px-4 sm:px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            actionColors[entry.action] || "bg-white/10 text-ink-soft"
                          }`}
                        >
                          {entry.action}
                        </span>
                        <span className="text-[12px] text-ink">{entry.entity}</span>
                      </div>
                      {entry.ip_address && (
                        <div className="text-[11px] text-ink-faint mt-1">IP {entry.ip_address}</div>
                      )}
                    </div>
                    <div className="text-[11px] text-ink-faint shrink-0">
                      {formatDate(entry.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
