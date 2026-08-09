"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDashboard } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface ProductRow {
  item_id: string;
  product: string;
  bag_size: number;
  in_bags: number;
  in_kg: number;
  out_bags: number;
  out_kg: number;
  remaining: number;
  remaining_bags: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
  const defaultTo = now.toISOString().split("T")[0];

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [preset, setPreset] = useState("30d");

  useEffect(() => {
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      router.replace("/challans");
      return;
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, from, to]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const result = await getDashboard(from, to);
      setRows(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  const applyPreset = (p: string) => {
    setPreset(p);
    const t = new Date();
    const toStr = t.toISOString().split("T")[0];
    let fromStr: string;
    switch (p) {
      case "7d":
        fromStr = new Date(t.getTime() - 7 * 86400000).toISOString().split("T")[0];
        break;
      case "30d":
        fromStr = new Date(t.getTime() - 30 * 86400000).toISOString().split("T")[0];
        break;
      case "mtd":
        fromStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-01`;
        break;
      default:
        fromStr = defaultFrom;
    }
    setFrom(fromStr);
    setTo(toStr);
  };

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        totalInBags: acc.totalInBags + r.in_bags,
        totalInKg: acc.totalInKg + r.in_kg,
        totalOutBags: acc.totalOutBags + r.out_bags,
        totalOutKg: acc.totalOutKg + r.out_kg,
        totalRemaining: acc.totalRemaining + r.remaining,
      }),
      { totalInBags: 0, totalInKg: 0, totalOutBags: 0, totalOutKg: 0, totalRemaining: 0 }
    );
  }, [rows]);

  const exportCSV = () => {
    const header = "Product,Bag Size (kg),IN (bags),IN (kg),OUT (bags),OUT (kg),Remaining,Remaining Bags";
    const csvRows = rows.map((r) =>
      [r.product, r.bag_size, r.in_bags, r.in_kg, r.out_bags, r.out_kg, r.remaining, r.remaining_bags].join(",")
    );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink">
            Inventory Dashboard <span className="text-[18px] text-ink-soft font-normal">/ इन्वेंटरी डैशबोर्ड</span>
          </h1>
          <p className="text-[14px] text-ink-soft mt-1">
            IN/OUT movement matrix by product for the selected period.
          </p>
          <p className="text-[13px] text-ink-faint mt-1">
            चयनित अवधि के लिए उत्पाद अनुसार IN/OUT आवाजाही मैट्रिक्स।
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex h-9 items-center gap-1.5 px-4 text-[13px] font-medium border border-border text-ink-soft hover:text-ink hover:bg-white/5 rounded-[10px] transition-colors print:hidden"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV / CSV निर्यात
        </button>
      </div>

      {/* Date Range */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 mb-6 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium text-ink-faint mb-1">From / से</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset(""); }} className="focus-ring h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-faint mb-1">To / तक</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreset(""); }} className="focus-ring h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-ink" />
          </div>
          {["7d", "30d", "mtd"].map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`h-9 px-3 text-[12px] font-medium rounded-[9px] transition-colors ${
                preset === p ? "bg-brand text-brand-ink" : "text-ink-soft hover:text-ink hover:bg-white/5"
              }`}
            >
              {p === "7d" ? "7 Days / 7 दिन" : p === "30d" ? "30 Days / 30 दिन" : "Month to Date / महीने से आज"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2">Total IN / कुल आना</div>
          <div className="font-display text-[28px] font-bold text-green-400 leading-none">{totals.totalInBags.toLocaleString()}</div>
          <div className="text-[11px] text-ink-faint mt-1.5">bags in period / अवधि में बोरी</div>
          <div className="text-[13px] text-green-400/80 mt-1">{totals.totalInKg.toLocaleString()} kg</div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2">Total OUT / कुल जाना</div>
          <div className="font-display text-[28px] font-bold text-orange-400 leading-none">{totals.totalOutBags.toLocaleString()}</div>
          <div className="text-[11px] text-ink-faint mt-1.5">bags in period / अवधि में बोरी</div>
          <div className="text-[13px] text-orange-400/80 mt-1">{totals.totalOutKg.toLocaleString()} kg</div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-2">Total Remaining / कुल शेष</div>
          <div className="font-display text-[28px] font-bold text-ink leading-none">{totals.totalRemaining.toLocaleString()}</div>
          <div className="text-[11px] text-ink-faint mt-1.5">kg remaining all time / सदैव शेष kg</div>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-[var(--radius-card)] border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-[13px] text-red-400 mb-3">{error}</p>
          <button onClick={fetchData} className="text-[13px] font-semibold text-brand hover:underline">Retry / पुनः प्रयास</button>
        </div>
      ) : loading ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center">
          <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-ink-faint mt-3">Loading inventory... / इन्वेंटरी लोड हो रही है...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center">
          <p className="text-[13px] text-ink-faint">No inventory movements in this period. / इस अवधि में कोई इन्वेंटरी आवाजाही नहीं।</p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-4 py-3">Product / उत्पाद</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-4 py-3">Bag Size / बोरी आकार</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-green-400/80 font-semibold px-4 py-3">IN (bags) / आना (बोरी)</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-green-400/80 font-semibold px-4 py-3">IN (kg)</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-orange-400/80 font-semibold px-4 py-3">OUT (bags) / जाना (बोरी)</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-orange-400/80 font-semibold px-4 py-3">OUT (kg)</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-4 py-3">Remaining / शेष</th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-4 py-3">Bags Left / बोरी शेष</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.item_id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-[13px] font-medium text-ink">{r.product}</td>
                    <td className="px-4 py-3 text-[13px] text-ink-soft text-right">{r.bag_size} kg</td>
                    <td className="px-4 py-3 text-[13px] text-green-400 text-right font-medium">{r.in_bags.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px] text-green-400/80 text-right">{r.in_kg.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px] text-orange-400 text-right font-medium">{r.out_bags.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[13px] text-orange-400/80 text-right">{r.out_kg.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-[13px] text-right font-semibold ${r.remaining > 0 ? "text-ink" : r.remaining < 0 ? "text-red-400" : "text-ink-faint"}`}>
                      {r.remaining.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-soft text-right">{r.remaining_bags.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-white/[0.02]">
                  <td className="px-4 py-3 text-[13px] font-bold text-ink">Total / कुल ({rows.length} items / उत्पाद)</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-[13px] text-green-400 text-right font-bold">{totals.totalInBags.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-green-400/80 text-right font-bold">{totals.totalInKg.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-orange-400 text-right font-bold">{totals.totalOutBags.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-orange-400/80 text-right font-bold">{totals.totalOutKg.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-ink text-right font-bold">{totals.totalRemaining.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-soft text-right font-bold">{rows.reduce((sum, r) => sum + r.remaining_bags, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
