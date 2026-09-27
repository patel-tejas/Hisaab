"use client";

/**
 * Backtest results: KPIs, the cumulative P&L curve, and the trade list.
 *
 * Every figure here came from a `quant/` computation via the deterministic
 * route. Nothing on this page derives a P&L — `tradesToEquity` only
 * accumulates engine-computed `net_pnl` values.
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

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatInr, formatInrPlain } from "@/components/ai-insights/format";
import {
  KPI_ORDER,
  METRIC_LABELS,
  formatMetric,
  metricHint,
  metricSentiment,
  tradesToEquity,
  type Sentiment,
} from "@/components/eve/metrics";
import { IntegrityNotice } from "@/components/eve/integrity-notice";
import type { BacktestResult } from "@/lib/eve/strategy";

const TONE: Record<Sentiment, string> = {
  pos: "text-emerald-600 dark:text-emerald-400",
  neg: "text-red-600 dark:text-red-400",
  warn: "text-amber-600 dark:text-amber-400",
  flat: "text-foreground",
};

export function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

export function ResultsPanel({ result }: { result: BacktestResult }) {
  const { metrics } = result;
  const trades = result.trades ?? [];
  const equity = tradesToEquity(trades);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {KPI_ORDER.map((key) => {
          const value = metrics[key];
          const hint = metricHint(key, metrics);
          return (
            <Card key={key} className="p-4">
              <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
                {METRIC_LABELS[key]}
              </p>
              <p
                className={cn(
                  "mt-1 text-xl font-semibold tabular-nums",
                  TONE[metricSentiment(key, value)],
                )}
              >
                {formatMetric(key, value)}
              </p>
              {hint && (
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
              )}
            </Card>
          );
        })}
      </div>

      <IntegrityNotice result={result} />

      {equity.length > 0 ? (
        <>
          <Card className="p-4">
            <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
              Cumulative net P&amp;L
            </p>
            <p className="mb-3 text-[11px] text-muted-foreground">
              After costs and slippage, by trade exit. Built from the engine&apos;s trade
              records.
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={equity} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="eve-pnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="i"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "trade", position: "insideBottomRight", fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  width={40}
                />
                <ReferenceLine y={0} className="stroke-border" strokeWidth={1} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  labelFormatter={(i) => `Trade ${i}`}
                  formatter={(v: number, name) => [
                    formatInr(v),
                    name === "cumulative" ? "Cumulative" : String(name),
                  ]}
                />
                <Area
                  type="stepAfter"
                  dataKey="cumulative"
                  strokeWidth={2}
                  fill="url(#eve-pnl)"
                  className={
                    (equity.at(-1)?.cumulative ?? 0) >= 0
                      ? "text-emerald-500 stroke-emerald-500"
                      : "text-red-500 stroke-red-500"
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
              Per-trade net P&amp;L
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={equity} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="i" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  width={40}
                />
                <ReferenceLine y={0} className="stroke-border" />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  labelFormatter={(i) => `Trade ${i}`}
                  formatter={(v: number) => [formatInr(v), "Net"]}
                />
                <Bar dataKey="net" radius={[2, 2, 0, 0]}>
                  {equity.map((p) => (
                    <Cell
                      key={p.i}
                      className={p.net >= 0 ? "fill-emerald-500" : "fill-red-500"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="overflow-hidden">
            <p className="border-b px-4 py-2.5 font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
              Trades ({trades.length})
            </p>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Side</th>
                    <th className="px-2 py-2 font-medium">Entry</th>
                    <th className="px-2 py-2 font-medium">Exit</th>
                    <th className="px-2 py-2 text-right font-medium">Costs</th>
                    <th className="px-4 py-2 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr key={t.trade_id} className="border-b last:border-0">
                      <td className="px-4 py-1.5 tabular-nums text-muted-foreground">
                        {t.trade_id}
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={
                            t.direction.toUpperCase() === "LONG"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                        {t.entry_time.replace("T", " ").slice(5, 16)}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                        {t.exit_time.replace("T", " ").slice(5, 16)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                        {formatInrPlain(t.costs)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-1.5 text-right font-medium tabular-nums",
                          t.net_pnl >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {formatInr(t.net_pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          This configuration produced no completed trades on {result.month} {result.timeframe}.
          Try a lower steepness threshold or a faster timeframe.
        </Card>
      )}
    </div>
  );
}
