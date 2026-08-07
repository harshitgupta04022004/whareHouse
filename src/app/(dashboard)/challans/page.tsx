"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listDOs, deleteDO } from "@/lib/api-client";
import {
  formatWeight,
  formatDate,
  last7DaysRange,
} from "@/lib/utils";

interface DORecord {
  do_id: string;
  do_number: string;
  direction: string;
  date: string;
  item_count: number;
  created_at: string;
  parties?: { name: string } | null;
  app_users?: { name: string } | null;
  do_items?: { bags: number; total_weight: number }[];
}

export default function DOsPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [DOs, setDOs] = useState<DORecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const range = last7DaysRange();
    setFrom(range.from);
    setTo(range.to);
  }, [user]);

  useEffect(() => {
    if (!user || !from || !to) return;
    fetchDOs();
  }, [user, from, to]);

  async function fetchDOs(nextCursor?: string) {
    setLoading(true);
    try {
      const result = await listDOs({
        from,
        to,
        cursor: nextCursor,
        limit: 50,
      });
      if (nextCursor) {
        setDOs((prev) => [...prev, ...result.data]);
      } else {
        setDOs(result.data);
      }
      setHasMore(result.hasMore);
      setCursor(result.cursor);
    } catch (err) {
      console.error("Failed to fetch DOs:", err);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    let bags = 0;
    let weight = 0;
    const vehicles = new Set<string>();

    for (const DO of DOs) {
      if (DO.do_items) {
        for (const item of DO.do_items) {
          bags += item.bags;
          weight += item.total_weight;
        }
      }
    }

    return { vehicles: vehicles.size, bags, weight };
  }, [DOs]);

  const handleApply = () => {
    setCursor(null);
    fetchDOs();
  };

  const handleToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setFrom(today);
    setTo(today);
  };

  const handleClear = () => {
    setFrom("");
    setTo("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this DO?")) return;
    try {
      await deleteDO(id);
      setDOs((prev) => prev.filter((d) => d.do_id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const showingRange =
    from && to
      ? `Showing ${formatDate(from)} - ${formatDate(to)}`
      : "";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink">
            DO Records
          </h1>
          <p className="text-[14px] text-ink-soft mt-1">
            Your deliveries &mdash; In &amp; Out, bags, weight and totals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/items"
            className="inline-flex h-9 items-center px-4 text-[13px] font-medium border border-border text-ink-soft hover:text-ink hover:bg-white/5 rounded-[10px] transition-colors"
          >
            Item list
          </Link>
          <Link
            href="/DOs/new"
            className="inline-flex h-9 items-center gap-1.5 px-4 text-[13px] font-semibold bg-brand hover:bg-brand-strong text-brand-ink rounded-[10px] shadow-[var(--shadow-sm)] transition-all active:scale-[0.98]"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New DO
          </Link>
        </div>
      </div>

      {/* Date Filter */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-[13px] font-medium text-ink-soft hover:text-ink transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
          </button>
          {showingRange && (
            <span className="text-[12px] text-ink-faint">{showingRange}</span>
          )}
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-medium text-ink-faint mb-1">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="focus-ring h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-faint mb-1">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="focus-ring h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink focus:outline-none"
              />
            </div>
            <button
              onClick={handleApply}
              className="inline-flex h-9 items-center gap-1.5 bg-brand hover:bg-brand-strong text-brand-ink px-4 rounded-[9px] text-[13px] font-semibold shadow-[var(--shadow-sm)] transition-all active:scale-[0.98]"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Apply
            </button>
            <button
              onClick={handleToday}
              className="h-9 px-4 text-[13px] font-medium text-ink-soft hover:text-ink hover:bg-white/5 rounded-[9px] transition-colors"
            >
              Today
            </button>
            {from && to && (
              <button
                onClick={handleClear}
                className="h-9 px-4 text-[13px] font-medium text-ink-soft hover:text-ink hover:bg-white/5 rounded-[9px] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Vehicles
            </span>
            <svg
              className="w-4 h-4 text-ink-faint"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
          </div>
          <div className="font-display text-[28px] font-bold text-ink leading-none">
            {stats.vehicles}
          </div>
          <div className="text-[11px] text-ink-faint mt-1.5">in selected period</div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Total Bags + बोरी
            </span>
            <svg
              className="w-4 h-4 text-ink-faint"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div className="font-display text-[28px] font-bold text-ink leading-none">
            {stats.bags}
          </div>
          <div className="text-[11px] text-ink-faint mt-1.5">
            all vehicles combined
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Total Weight
            </span>
            <svg
              className="w-4 h-4 text-ink-faint"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
          </div>
          <div className="font-display text-[28px] font-bold text-ink leading-none">
            {formatWeight(stats.weight)}
          </div>
          <div className="text-[11px] text-ink-faint mt-1.5">
            all vehicles combined
          </div>
        </div>
      </div>

      {/* DO List */}
      {loading && DOs.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-ink-faint mt-3">Loading DOs...</p>
        </div>
      ) : DOs.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center">
          <div className="w-12 h-12 rounded-[13px] bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="font-display font-semibold text-ink mb-1">
            {from && to ? "No DOs in this range" : "No DOs yet"}
          </h3>
          <p className="text-[13px] text-ink-faint mb-5 max-w-sm mx-auto">
            {from && to
              ? "Try a different date range, or clear the filter."
              : "Record your first delivery DO — add the vehicle, items, bags and weight, and totals are calculated for you."}
          </p>
          <Link
            href="/challans/new"
            className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-strong text-brand-ink px-5 py-2.5 rounded-[11px] text-[13px] font-semibold shadow-[var(--shadow-sm)] transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create a DO
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {DOs.map((DO) => {
            const totalBags = DO.do_items?.reduce((s, i) => s + i.bags, 0) ?? 0;
            const totalWeight = DO.do_items?.reduce((s, i) => s + i.total_weight, 0) ?? 0;

            return (
              <div
                key={DO.do_id}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-5 hover:border-brand/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          DO.direction === "IN"
                            ? "bg-green-500/15 text-green-400"
                            : "bg-orange-500/15 text-orange-400"
                        }`}
                      >
                        {DO.direction === "IN"
                          ? "IN — भीतर आना"
                          : "OUT — बाहर जाना"}
                      </span>
                      <span className="text-[12px] text-ink-faint">
                        {formatDate(DO.date)}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-[14px] text-ink truncate">
                      {DO.parties?.name || DO.do_number || "Unnamed DO"}
                    </h3>
                    <div className="flex items-center gap-4 mt-1.5 text-[12px] text-ink-faint">
                      <span>
                        DO: <span className="text-ink-soft">{DO.do_number || "N/A"}</span>
                      </span>
                      {DO.app_users && (
                        <span>
                          By: <span className="text-ink-soft">{DO.app_users.name}</span>
                        </span>
                      )}
                    </div>
                    {DO.item_count > 0 && (
                      <div className="flex items-center gap-4 mt-2 text-[12px] text-ink-faint">
                        <span>Items: <span className="text-ink-soft">{DO.item_count}</span></span>
                        <span>Bags: <span className="text-ink-soft">{totalBags}</span></span>
                        <span>Weight: <span className="text-ink-soft">{formatWeight(totalWeight)}</span></span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(DO.do_id)}
                    className="shrink-0 p-1.5 text-ink-faint hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete DO"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={() => fetchDOs(cursor!)}
              className="w-full py-3 text-[13px] font-medium text-brand hover:bg-white/5 rounded-[11px] transition-colors"
            >
              Load more...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
