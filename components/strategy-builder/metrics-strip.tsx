"use client";

/** A compact grid of a backtest's headline numbers, all from the engine. */

import { KPI_ORDER, METRIC_LABELS, formatMetric, metricSentiment } from "@/components/eve/metrics";
import { cn } from "@/lib/utils";
import type { BacktestMetrics } from "@/lib/eve/strategy";

const TONE = {
  pos: "text-[var(--success)]",
  neg: "text-[var(--destructive)]",
  warn: "text-[var(--warning)]",
  flat: "text-foreground",
} as const;

export function MetricsStrip({
  metrics,
  keys = KPI_ORDER,
  className,
}: {
  metrics: Partial<BacktestMetrics>;
  keys?: (keyof BacktestMetrics)[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/60 bg-border/60 sm:grid-cols-3", className)}>
      {keys.map((key) => {
        const value = (metrics[key] ?? null) as number | null;
        return (
          <div key={key} className="bg-card px-12 py-8">
            <dt className="text-[11px] text-muted-foreground">{METRIC_LABELS[key]}</dt>
            <dd className={cn("mt-0.5 font-mono text-sm tabular-nums", TONE[metricSentiment(key, value)])}>
              {formatMetric(key, value)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
