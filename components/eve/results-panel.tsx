"use client";

/**
 * Backtest results: a hero verdict, supporting metrics, the P&L curve, and the
 * trade ledger.
 *
 * Structured as a hierarchy rather than a grid of equal tiles. Net P&L is the
 * number the user came for, so it gets the display voice and the curve sits
 * directly beneath it; everything else is supporting evidence at a smaller
 * scale. Six identical boxes give every metric the same weight, which is the
 * same as giving none of them any.
 *
 * Every figure came from a `quant/` computation via the deterministic route.
 * `tradesToEquity` only accumulates engine-computed `net_pnl` values.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatInr, formatInrPlain } from "@/components/ai-insights/format";
import {
  METRIC_LABELS,
  formatMetric,
  metricHint,
  metricSentiment,
  tradesToEquity,
  type Sentiment,
} from "@/components/eve/metrics";
import { IntegrityNotice } from "@/components/eve/integrity-notice";
import type { BacktestMetrics, BacktestResult } from "@/lib/eve/strategy";

const TONE: Record<Sentiment, string> = {
  pos: "text-[var(--success)]",
  neg: "text-[var(--destructive)]",
  warn: "text-[var(--warning)]",
  flat: "text-foreground",
};

/** Supporting metrics, shown beneath the hero. */
const SUPPORTING: (keyof BacktestMetrics)[] = [
  "profit_factor",
  "max_drawdown_pct",
  "total_trades",
  "win_rate",
  "sharpe",
];

export function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="panel panel-p space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-[120px] w-full rounded-lg" />
      </div>
      <div className="panel divide-y divide-border/60">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 md:px-8">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultsPanel({ result }: { result: BacktestResult }) {
  const { metrics } = result;
  const trades = result.trades ?? [];
  const equity = tradesToEquity(trades);
  const net = metrics.net_pnl ?? 0;
  const positive = net >= 0;
  const curveColor = positive ? "var(--success)" : "var(--destructive)";

  return (
    <div className="stagger space-y-4">
      {/* ── Hero: the number they came for, with its curve ─────────────── */}
      <section className="bezel">
        <div className="bezel-core overflow-hidden">
        <div className="panel-px pt-5 md:pt-8">
          <p className="label-mono">Net profit &amp; loss</p>
          <p
            className={cn(
              "numeric mt-2 text-4xl font-medium md:text-5xl",
              positive ? "text-[var(--success)]" : "text-[var(--destructive)]",
            )}
          >
            {formatMetric("net_pnl", metrics.net_pnl)}
          </p>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            {result.month} · {result.timeframe} · after costs and{" "}
            {result.slippage} slippage
            {metrics.total_trades !== null && (
              <> · {metrics.total_trades} {metrics.total_trades === 1 ? "trade" : "trades"}</>
            )}
          </p>
        </div>

        {equity.length > 0 ? (
          <div className="mt-5 h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="eve-hero-pnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={curveColor} stopOpacity={0.24} />
                    <stop offset="100%" stopColor={curveColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 10,
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    color: "var(--popover-foreground)",
                  }}
                  labelFormatter={(i) => `Trade ${i}`}
                  formatter={(v: number) => [formatInr(v), "Cumulative"]}
                />
                <Area
                  type="stepAfter"
                  dataKey="cumulative"
                  stroke={curveColor}
                  strokeWidth={1.75}
                  fill="url(#eve-hero-pnl)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="panel-px pb-5 pt-4 md:pb-8">
            <p className="panel-quiet px-4 py-6 text-center text-sm text-muted-foreground">
              No completed trades on this configuration. Try a lower steepness
              threshold, or a faster timeframe.
            </p>
          </div>
        )}
        </div>
      </section>

      <IntegrityNotice result={result} />

      {/* ── Supporting metrics: a ledger, not a tile grid ──────────────── */}
      <section className="panel">
        <p className="label-mono panel-px pt-5 md:pt-6">The rest of the picture</p>
        <dl className="mt-3 divide-y divide-border/60">
          {SUPPORTING.map((key) => {
            const value = metrics[key];
            const hint = metricHint(key, metrics);
            return (
              <div
                key={key}
                className="panel-px flex items-baseline justify-between gap-6 py-3"
              >
                <div className="min-w-0">
                  <dt className="text-sm font-medium">{METRIC_LABELS[key]}</dt>
                  {hint && (
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                      {hint}
                    </p>
                  )}
                </div>
                <dd
                  className={cn(
                    "numeric shrink-0 text-lg font-medium",
                    TONE[metricSentiment(key, value)],
                  )}
                >
                  {formatMetric(key, value)}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="h-5 md:h-6" />
      </section>

      {equity.length > 0 && (
        <>
          <section className="panel panel-p">
            <p className="label-mono">Per-trade result</p>
            <div className="mt-4 h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equity} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="i"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    width={34}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.35 }}
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 10,
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      color: "var(--popover-foreground)",
                    }}
                    labelFormatter={(i) => `Trade ${i}`}
                    formatter={(v: number) => [formatInr(v), "Net"]}
                  />
                  <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                    {equity.map((p) => (
                      <Cell
                        key={p.i}
                        fill={p.net >= 0 ? "var(--success)" : "var(--destructive)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <p className="label-mono panel-px pt-5 md:pt-6">
              Trade ledger · {trades.length}
            </p>
            <div className="mt-3 max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="label-mono border-b border-border/70 text-left">
                    <th className="py-2 pl-5 font-normal md:pl-8">#</th>
                    <th className="px-2 py-2 font-normal">Side</th>
                    <th className="px-2 py-2 font-normal">Held</th>
                    <th className="px-2 py-2 text-right font-normal">Costs</th>
                    <th className="py-2 pr-5 text-right font-normal md:pr-8">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => {
                    const overnight = t.entry_time.slice(0, 10) !== t.exit_time.slice(0, 10);
                    return (
                      <tr
                        key={t.trade_id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="numeric py-2 pl-5 text-muted-foreground md:pl-8">
                          {t.trade_id}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={
                              t.direction.toUpperCase() === "LONG"
                                ? "text-[var(--success)]"
                                : "text-[var(--destructive)]"
                            }
                          >
                            {t.direction.toLowerCase()}
                          </span>
                        </td>
                        <td className="numeric px-2 py-2 text-xs text-muted-foreground">
                          {t.entry_time.replace("T", " ").slice(5, 16)}
                          {overnight && (
                            <span
                              className="ml-1.5 text-[var(--warning)]"
                              title="Held across sessions — no end-of-day square-off"
                            >
                              →{t.exit_time.slice(8, 10)}
                            </span>
                          )}
                        </td>
                        <td className="numeric px-2 py-2 text-right text-muted-foreground">
                          {formatInrPlain(t.costs)}
                        </td>
                        <td
                          className={cn(
                            "numeric py-2 pr-5 text-right font-medium md:pr-8",
                            t.net_pnl >= 0
                              ? "text-[var(--success)]"
                              : "text-[var(--destructive)]",
                          )}
                        >
                          {formatInr(t.net_pnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
