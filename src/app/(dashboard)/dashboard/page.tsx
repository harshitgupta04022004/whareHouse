"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getDashboard } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import ExportMenu from "@/components/ExportMenu";

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

interface Insights {
  period: { from: string; to: string; days: number };
  do_summary: {
    total_dos: number;
    in_dos: number;
    out_dos: number;
    avg_dos_per_day: number;
    working_days_with_activity: number;
  };
  movement: {
    net_bags: number;
    net_kg: number;
    stock_build_up: boolean;
    turnover_pct: number;
  };
  stock_alerts: {
    zero_or_negative: Array<{ product: string; remaining: number; remaining_bags: number }>;
    low_stock: Array<{ product: string; remaining: number; remaining_bags: number }>;
    idle_products: string[];
    active_products: number;
    total_products: number;
  };
  top_parties: Array<{
    name: string;
    dos: number;
    bags: number;
    weight: number;
    in_bags: number;
    out_bags: number;
  }>;
  top_staff: Array<{ name: string; dos: number; bags: number }>;
  top_stock: Array<{ product: string; remaining: number; remaining_bags: number }>;
  most_moved: Array<{ product: string; in_bags: number; out_bags: number; total_bags: number }>;
  daily_trend: Array<{
    date: string;
    in_dos: number;
    out_dos: number;
    in_bags: number;
    out_bags: number;
  }>;
  recent_dos: Array<{
    do_id: string;
    do_number: string;
    direction: string;
    date: string;
    party: string;
    created_by: string;
    bags: number;
  }>;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
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
      setRows(result.data ?? []);
      setInsights(result.insights ?? null);
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
        totalRemainingBags: acc.totalRemainingBags + r.remaining_bags,
      }),
      {
        totalInBags: 0,
        totalInKg: 0,
        totalOutBags: 0,
        totalOutKg: 0,
        totalRemaining: 0,
        totalRemainingBags: 0,
      },
    );
  }, [rows]);

  const exportRows = useMemo(
    () =>
      rows.map((r) => ({
        product: r.product,
        bag_size: r.bag_size,
        in_bags: r.in_bags,
        in_kg: r.in_kg,
        out_bags: r.out_bags,
        out_kg: r.out_kg,
        remaining: r.remaining,
        remaining_bags: r.remaining_bags,
      })),
    [rows],
  );

  const maxDailyBags = useMemo(() => {
    if (!insights?.daily_trend?.length) return 1;
    return Math.max(
      1,
      ...insights.daily_trend.map((d) => d.in_bags + d.out_bags),
    );
  }, [insights]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] text-ink">
            Inventory Dashboard{" "}
            <span className="text-[16px] sm:text-[18px] text-ink-soft font-normal">
              / इन्वेंटरी डैशबोर्ड
            </span>
          </h1>
          <p className="text-[12px] sm:text-[14px] text-ink-soft mt-1">
            Stock movement, DO activity and warehouse insights for daily operations.
          </p>
          <p className="text-[11px] sm:text-[13px] text-ink-faint mt-1">
            दैनिक गोदाम कार्य के लिए स्टॉक आवाजाही, DO गतिविधि और उपयोगी जानकारी।
          </p>
        </div>
        <ExportMenu
          filename={`inventory-${from}-${to}`}
          title="Inventory Dashboard"
          sheetName="Inventory"
          subtitle={`${formatDate(from)} - ${formatDate(to)}`}
          columns={[
            { key: "product", header: "Product" },
            { key: "bag_size", header: "Bag Size (kg)" },
            { key: "in_bags", header: "IN (bags)" },
            { key: "in_kg", header: "IN (kg)" },
            { key: "out_bags", header: "OUT (bags)" },
            { key: "out_kg", header: "OUT (kg)" },
            { key: "remaining", header: "Remaining (kg)" },
            { key: "remaining_bags", header: "Remaining Bags" },
          ]}
          rows={exportRows}
          disabled={loading}
        />
      </div>

      {/* Date Range */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-5 mb-4 sm:mb-6 print:hidden">
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <div className="flex-1 min-w-[120px] sm:flex-none">
            <label className="block text-[11px] font-medium text-ink-faint mb-1">From / से</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("");
              }}
              className="focus-ring h-9 w-full rounded-[9px] border border-border bg-surface-2 px-2 sm:px-3 text-[12px] sm:text-[13px] text-ink"
            />
          </div>
          <div className="flex-1 min-w-[120px] sm:flex-none">
            <label className="block text-[11px] font-medium text-ink-faint mb-1">To / तक</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("");
              }}
              className="focus-ring h-9 w-full rounded-[9px] border border-border bg-surface-2 px-2 sm:px-3 text-[12px] sm:text-[13px] text-ink"
            />
          </div>
          {["7d", "30d", "mtd"].map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`h-9 px-2 sm:px-3 text-[11px] sm:text-[12px] font-medium rounded-[9px] transition-colors ${
                preset === p ? "bg-brand text-brand-ink" : "text-ink-soft hover:text-ink hover:bg-white/5"
              }`}
            >
              {p === "7d" ? "7D" : p === "30d" ? "30D" : "MTD"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards — kept */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-5">
          <div className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-1 sm:mb-2">
            IN / आना
          </div>
          <div className="font-display text-[18px] sm:text-[28px] font-bold text-green-400 leading-none">
            {totals.totalInBags.toLocaleString()}
          </div>
          <div className="text-[9px] sm:text-[11px] text-ink-faint mt-1">bags / बोरी</div>
          <div className="text-[11px] sm:text-[13px] text-green-400/80 mt-0.5 sm:mt-1">
            {totals.totalInKg.toLocaleString()} kg
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-5">
          <div className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-1 sm:mb-2">
            OUT / जाना
          </div>
          <div className="font-display text-[18px] sm:text-[28px] font-bold text-orange-400 leading-none">
            {totals.totalOutBags.toLocaleString()}
          </div>
          <div className="text-[9px] sm:text-[11px] text-ink-faint mt-1">bags / बोरी</div>
          <div className="text-[11px] sm:text-[13px] text-orange-400/80 mt-0.5 sm:mt-1">
            {totals.totalOutKg.toLocaleString()} kg
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-5">
          <div className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-ink-faint mb-1 sm:mb-2">
            Remaining / शेष
          </div>
          <div className="font-display text-[18px] sm:text-[28px] font-bold text-ink leading-none">
            {totals.totalRemaining.toLocaleString()}
          </div>
          <div className="text-[9px] sm:text-[11px] text-ink-faint mt-1">kg all time</div>
          <div className="text-[11px] sm:text-[13px] text-ink-soft mt-0.5 sm:mt-1">
            {totals.totalRemainingBags.toLocaleString()} bags left
          </div>
        </div>
      </div>

      {/* New insight strip */}
      {insights && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="rounded-[12px] border border-border bg-surface px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              DOs in period / अवधि में DO
            </div>
            <div className="text-[20px] font-bold text-ink mt-0.5">
              {insights.do_summary.total_dos}
            </div>
            <div className="text-[11px] text-ink-faint">
              {insights.do_summary.in_dos} IN · {insights.do_summary.out_dos} OUT
            </div>
          </div>
          <div className="rounded-[12px] border border-border bg-surface px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Avg / day · औसत / दिन
            </div>
            <div className="text-[20px] font-bold text-ink mt-0.5">
              {insights.do_summary.avg_dos_per_day}
            </div>
            <div className="text-[11px] text-ink-faint">
              Active days: {insights.do_summary.working_days_with_activity}/{insights.period.days}
            </div>
          </div>
          <div className="rounded-[12px] border border-border bg-surface px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Net stock / शुद्ध स्टॉक
            </div>
            <div
              className={`text-[20px] font-bold mt-0.5 ${
                insights.movement.net_bags >= 0 ? "text-green-400" : "text-orange-400"
              }`}
            >
              {insights.movement.net_bags >= 0 ? "+" : ""}
              {insights.movement.net_bags.toLocaleString()} bags
            </div>
            <div className="text-[11px] text-ink-faint">
              {insights.movement.stock_build_up ? "Stock building up / स्टॉक बढ़ रहा" : "Stock reducing / स्टॉक घट रहा"}
            </div>
          </div>
          <div className="rounded-[12px] border border-border bg-surface px-3 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Active products / सक्रिय माल
            </div>
            <div className="text-[20px] font-bold text-ink mt-0.5">
              {insights.stock_alerts.active_products}/{insights.stock_alerts.total_products}
            </div>
            <div className="text-[11px] text-ink-faint">
              Idle: {insights.stock_alerts.idle_products.length}
            </div>
          </div>
        </div>
      )}

      {/* Alerts — government warehouse ops */}
      {insights && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4 sm:mb-6">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-[13px] font-semibold text-ink mb-1">
              Stock alerts / स्टॉक चेतावनी
            </h2>
            <p className="text-[11px] text-ink-faint mb-3">
              Check before approving OUT DOs / OUT DO पास करने से पहले जाँचें
            </p>
            {insights.stock_alerts.zero_or_negative.length === 0 &&
            insights.stock_alerts.low_stock.length === 0 ? (
              <p className="text-[13px] text-green-400">
                No critical stock issues. / कोई गंभीर स्टॉक समस्या नहीं।
              </p>
            ) : (
              <div className="space-y-2">
                {insights.stock_alerts.zero_or_negative.map((a) => (
                  <div
                    key={`z-${a.product}`}
                    className="flex items-center justify-between gap-2 rounded-[9px] bg-red-500/10 border border-red-500/20 px-3 py-2"
                  >
                    <span className="text-[13px] text-ink font-medium">{a.product}</span>
                    <span className="text-[11px] font-semibold text-red-400">
                      Empty / खाली ({a.remaining} kg)
                    </span>
                  </div>
                ))}
                {insights.stock_alerts.low_stock.map((a) => (
                  <div
                    key={`l-${a.product}`}
                    className="flex items-center justify-between gap-2 rounded-[9px] bg-amber-500/10 border border-amber-500/20 px-3 py-2"
                  >
                    <span className="text-[13px] text-ink font-medium">{a.product}</span>
                    <span className="text-[11px] font-semibold text-amber-400">
                      Low · {a.remaining_bags} bags left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-[13px] font-semibold text-ink mb-1">
              Today&apos;s ops tip / आज की सलाह
            </h2>
            <ul className="mt-2 space-y-2 text-[12px] text-ink-soft">
              <li>
                · Record every vehicle as IN/OUT DO same day — same-day entry keeps stock audit-ready.
              </li>
              <li>
                · Verify party name before creating DO — helps later GST / godown reports.
              </li>
              <li>
                · Net movement this period:{" "}
                <span className="text-ink font-medium">
                  {insights.movement.net_kg.toLocaleString()} kg
                </span>
                {insights.movement.stock_build_up
                  ? " (receipts higher than issues)"
                  : " (issues higher than receipts)"}
              </li>
              {insights.stock_alerts.idle_products.length > 0 && (
                <li>
                  · No movement for:{" "}
                  <span className="text-ink">
                    {insights.stock_alerts.idle_products.slice(0, 4).join(", ")}
                    {insights.stock_alerts.idle_products.length > 4 ? "…" : ""}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Parties + Staff + Movement */}
      {insights && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4 sm:mb-6">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-[13px] font-semibold text-ink mb-3">
              Top parties / मुख्य पार्टी
            </h2>
            {insights.top_parties.length === 0 ? (
              <p className="text-[12px] text-ink-faint">No DO parties in this period.</p>
            ) : (
              <div className="space-y-2">
                {insights.top_parties.map((p, idx) => (
                  <div key={`${p.name}-${idx}`} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink truncate">{p.name}</div>
                      <div className="text-[11px] text-ink-faint">
                        {p.dos} DOs · IN {p.in_bags} / OUT {p.out_bags}
                      </div>
                    </div>
                    <div className="text-[12px] font-semibold text-ink-soft shrink-0">
                      {p.bags} bags
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-[13px] font-semibold text-ink mb-3">
              Staff workload / स्टाफ काम
            </h2>
            {insights.top_staff.length === 0 ? (
              <p className="text-[12px] text-ink-faint">No staff activity in this period.</p>
            ) : (
              <div className="space-y-2">
                {insights.top_staff.map((s, idx) => (
                  <div key={`${s.name}-${idx}`} className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-medium text-ink truncate">{s.name}</div>
                    <div className="text-[11px] text-ink-faint shrink-0">
                      {s.dos} DOs · {s.bags} bags
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
            <h2 className="text-[13px] font-semibold text-ink mb-3">
              Most moved / सबसे अधिक आवाजाही
            </h2>
            {insights.most_moved.length === 0 ? (
              <p className="text-[12px] text-ink-faint">No product movement in this period.</p>
            ) : (
              <div className="space-y-2">
                {insights.most_moved.map((m) => (
                  <div key={m.product} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink truncate">{m.product}</div>
                      <div className="text-[11px] text-ink-faint">
                        IN {m.in_bags} · OUT {m.out_bags}
                      </div>
                    </div>
                    <div className="text-[12px] font-semibold text-brand shrink-0">
                      {m.total_bags}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily trend simple bars */}
      {insights && insights.daily_trend.length > 0 && !loading && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[13px] font-semibold text-ink">
              Daily DO bags / दैनिक बोरी आवाजाही
            </h2>
            <span className="text-[11px] text-ink-faint">
              Green = IN · Orange = OUT
            </span>
          </div>
          <div className="flex items-end gap-1 h-24 overflow-x-auto pb-1">
            {insights.daily_trend.map((d) => {
              const inH = Math.max(2, Math.round((d.in_bags / maxDailyBags) * 80));
              const outH = Math.max(d.out_bags > 0 ? 2 : 0, Math.round((d.out_bags / maxDailyBags) * 80));
              return (
                <div
                  key={d.date}
                  className="flex flex-col items-center gap-1 min-w-[28px] flex-1"
                  title={`${d.date}: IN ${d.in_bags} bags (${d.in_dos} DO), OUT ${d.out_bags} bags (${d.out_dos} DO)`}
                >
                  <div className="flex items-end gap-0.5 h-20">
                    <div className="w-2.5 rounded-t bg-green-400/80" style={{ height: `${inH}px` }} />
                    <div className="w-2.5 rounded-t bg-orange-400/80" style={{ height: `${outH || 0}px` }} />
                  </div>
                  <span className="text-[9px] text-ink-faint">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent DOs */}
      {insights && insights.recent_dos.length > 0 && !loading && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden mb-4 sm:mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-[13px] font-semibold text-ink">
              Recent DOs / हाल के DO
            </h2>
            <button
              onClick={() => router.push("/challans")}
              className="text-[12px] font-medium text-brand hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {insights.recent_dos.map((d) => (
              <button
                key={d.do_id}
                onClick={() => router.push(`/challans/${d.do_id}`)}
                className="w-full text-left px-4 py-2.5 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-ink truncate">{d.party}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        d.direction === "IN"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-orange-500/15 text-orange-400"
                      }`}
                    >
                      {d.direction}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-faint">
                    {d.do_number} · {d.date} · {d.created_by}
                  </div>
                </div>
                <div className="text-[12px] text-ink-soft shrink-0">{d.bags} bags</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Existing product matrix table — kept */}
      <div className="mb-2">
        <h2 className="text-[13px] font-semibold text-ink">
          Product matrix / उत्पाद मैट्रिक्स
        </h2>
        <p className="text-[11px] text-ink-faint">
          Same IN/OUT/Remaining view you already use for stock checks.
        </p>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-card)] border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-[13px] text-red-400 mb-3">{error}</p>
          <button onClick={fetchData} className="text-[13px] font-semibold text-brand hover:underline">
            Retry / पुनः प्रयास
          </button>
        </div>
      ) : loading ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center">
          <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-ink-faint mt-3">
            Loading inventory... / इन्वेंटरी लोड हो रही है...
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-12 text-center">
          <p className="text-[13px] text-ink-faint">
            No inventory movements in this period. / इस अवधि में कोई इन्वेंटरी आवाजाही नहीं।
          </p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-4 py-3">
                    Product / उत्पाद
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-4 py-3">
                    Bag Size / बोरी आकार
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-green-400/80 font-semibold px-4 py-3">
                    IN (bags) / आना (बोरी)
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-green-400/80 font-semibold px-4 py-3">
                    IN (kg)
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-orange-400/80 font-semibold px-4 py-3">
                    OUT (bags) / जाना (बोरी)
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-orange-400/80 font-semibold px-4 py-3">
                    OUT (kg)
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-4 py-3">
                    Remaining / शेष
                  </th>
                  <th className="text-right text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-4 py-3">
                    Bags Left / बोरी शेष
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.item_id}
                    className="border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-[13px] font-medium text-ink">{r.product}</td>
                    <td className="px-4 py-3 text-[13px] text-ink-soft text-right">{r.bag_size} kg</td>
                    <td className="px-4 py-3 text-[13px] text-green-400 text-right font-medium">
                      {r.in_bags.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-green-400/80 text-right">
                      {r.in_kg.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-orange-400 text-right font-medium">
                      {r.out_bags.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-orange-400/80 text-right">
                      {r.out_kg.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 text-[13px] text-right font-semibold ${
                        r.remaining > 0
                          ? "text-ink"
                          : r.remaining < 0
                            ? "text-red-400"
                            : "text-ink-faint"
                      }`}
                    >
                      {r.remaining.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink-soft text-right">
                      {r.remaining_bags.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-white/[0.02]">
                  <td className="px-4 py-3 text-[13px] font-bold text-ink">
                    Total / कुल ({rows.length} items / उत्पाद)
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-[13px] text-green-400 text-right font-bold">
                    {totals.totalInBags.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-green-400/80 text-right font-bold">
                    {totals.totalInKg.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-orange-400 text-right font-bold">
                    {totals.totalOutBags.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-orange-400/80 text-right font-bold">
                    {totals.totalOutKg.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink text-right font-bold">
                    {totals.totalRemaining.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-soft text-right font-bold">
                    {totals.totalRemainingBags.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
