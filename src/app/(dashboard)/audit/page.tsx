"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { listAuditLog, verifyAuditIntegrity } from "@/lib/api-client";
import ExportMenu from "@/components/ExportMenu";

interface AuditEntry {
  log_id: number;
  user_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  ip_address: string | null;
  timestamp: string;
  app_users?: { name: string } | null;
}

export default function AuditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.replace("/challans");
      return;
    }
    fetchEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, actionFilter]);

  async function fetchEntries(nextCursor?: string) {
    setLoading(true);
    try {
      const result = await listAuditLog({
        cursor: nextCursor,
        limit: 50,
        action: actionFilter || undefined,
      });
      if (nextCursor) {
        setEntries((prev) => [...prev, ...result.data]);
      } else {
        setEntries(result.data);
      }
      setHasMore(result.hasMore);
      setCursor(result.cursor);
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleVerify = async () => {
    setVerifying(true);
    setIntegrityResult(null);
    try {
      const result = await verifyAuditIntegrity();
      if (result && typeof result.ok === "boolean") {
        setIntegrityResult(
          result.ok
            ? "Audit chain integrity verified — no tampering detected."
            : `Chain broken at log #${result.brokenAt}: ${result.message}`
        );
      } else {
        setIntegrityResult("Failed to verify integrity.");
      }
    } catch (err) {
      setIntegrityResult("Failed to verify integrity.");
    } finally {
      setVerifying(false);
    }
  };

  const actionColors: Record<string, string> = {
    create: "bg-green-500/15 text-green-400",
    update: "bg-blue-500/15 text-blue-400",
    delete: "bg-red-500/15 text-red-400",
    login: "bg-purple-500/15 text-purple-400",
    logout: "bg-yellow-500/15 text-yellow-400",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-[12px] text-ink-faint mb-6">
        <span className="hover:text-ink-soft cursor-pointer transition-colors" onClick={() => router.push("/challans")}>
          DOs
        </span>
        <span className="mx-2">/</span>
        <span className="text-ink-soft">Audit Log</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="font-display text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] text-ink mb-1">
            Audit Log
          </h1>
          <p className="text-[12px] sm:text-[14px] text-ink-soft">
            Append-only trail of all actions.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportMenu
            filename={`audit-${actionFilter || "all"}`}
            title="Audit Log"
            sheetName="Audit"
            subtitle={actionFilter ? `Filter: ${actionFilter}` : undefined}
            columns={[
              { key: "timestamp", header: "Timestamp" },
              { key: "user", header: "User" },
              { key: "action", header: "Action" },
              { key: "entity", header: "Entity" },
              { key: "entity_id", header: "Entity ID" },
              { key: "ip_address", header: "IP Address" },
            ]}
            rows={entries.map((e) => ({
              timestamp: e.timestamp ? new Date(e.timestamp).toLocaleString("en-IN") : "",
              user: e.app_users?.name ?? e.user_id ?? "",
              action: e.action,
              entity: e.entity,
              entity_id: e.entity_id ?? "",
              ip_address: e.ip_address ?? "",
            }))}
            disabled={loading}
          />
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex h-9 items-center gap-2 px-3 sm:px-4 text-[12px] sm:text-[13px] font-semibold border border-border text-ink-soft hover:text-ink hover:bg-white/5 rounded-[10px] transition-colors disabled:opacity-60"
          >
            {verifying ? (
              <div className="w-3.5 h-3.5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
            Verify Integrity
          </button>
        </div>
      </div>

      {integrityResult && (
        <div className={`mb-6 px-4 py-3 rounded-[11px] text-[13px] ${integrityResult.includes("verified") ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {integrityResult}
        </div>
      )}

      {/* Action Filter */}
      <div className="mb-4">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink transition-colors"
        >
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
        {loading && entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
            <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-2" />
            Loading audit log...
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-faint">
            No audit entries yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-5 py-2.5">#</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-5 py-2.5">Time</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-5 py-2.5">Actor</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-5 py-2.5">Action</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-5 py-2.5">Entity</th>
                    <th className="text-left text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-5 py-2.5">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.log_id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-2.5 text-[12px] text-ink-faint font-mono">{entry.log_id}</td>
                      <td className="px-5 py-2.5 text-[12px] text-ink-soft">
                        {new Date(entry.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-5 py-2.5 text-[12px] text-ink-soft">
                        {entry.app_users?.name || entry.user_id?.slice(0, 8) || "System"}
                      </td>
                      <td className="px-5 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${actionColors[entry.action] || "bg-white/5 text-ink-faint"}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-[12px] text-ink-soft">
                        {entry.entity}
                        {entry.entity_id && <span className="text-ink-faint ml-1">({entry.entity_id.slice(0, 8)}...)</span>}
                      </td>
                      <td className="px-5 py-2.5 text-[11px] text-ink-faint font-mono">{entry.ip_address || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <button
                onClick={() => fetchEntries(cursor!)}
                className="w-full py-3 text-[13px] font-medium text-brand hover:bg-white/5 transition-colors border-t border-border"
              >
                Load more...
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
