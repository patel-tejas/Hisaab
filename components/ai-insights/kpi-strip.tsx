"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { InsightsMetrics } from "@/lib/ai/insights"
import { formatInr, formatInrPlain } from "./format"

export function KpiStrip({ metrics }: { metrics: InsightsMetrics }) {
  const items = [
    {
      label: "Win rate",
      value: `${metrics.winRate}%`,
      hint: `${metrics.winCount}W / ${metrics.lossCount}L`,
      tone: metrics.winRate >= 50 ? "pos" : "neg",
    },
    {
      label: "Total P&L",
      value: formatInr(metrics.totalPnl),
      hint: `Avg ${formatInr(metrics.avgPnl)}`,
      tone: metrics.totalPnl >= 0 ? "pos" : "neg",
    },
    {
      label: "Max drawdown",
      value: formatInrPlain(metrics.maxDrawdown),
      hint: "Peak to trough",
      tone: "warn" as const,
    },
    {
      label: "Sharpe",
      value: metrics.sharpeRatio.toFixed(2),
      hint: metrics.sharpeRatio >= 1 ? "Good" : "Below optimal",
      tone: metrics.sharpeRatio >= 1 ? "pos" : "warn",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-1 text-xl font-semibold tabular-nums",
              item.tone === "pos" && "text-emerald-500",
              item.tone === "neg" && "text-red-400",
              item.tone === "warn" && "text-amber-500"
            )}
          >
            {item.value}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
        </Card>
      ))}
    </div>
  )
}
