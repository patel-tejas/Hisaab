"use client"

import { Card } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { InsightsMetrics, InsightsPayload } from "@/lib/ai/insights"
import { formatInr } from "./format"

export function WhatIfChart({
  metrics,
  scenarios,
}: {
  metrics: InsightsMetrics
  scenarios?: InsightsPayload["whatIfScenarios"]
}) {
  const data = metrics.whatIf.map((w) => {
    const narrative = scenarios?.find(
      (s) =>
        s.scenario.toLowerCase().includes(w.label.toLowerCase().slice(0, 8)) ||
        Math.abs(s.projectedPnl - w.projectedPnl) < 1
    )
    return {
      name: w.label.length > 18 ? `${w.label.slice(0, 16)}…` : w.label,
      fullName: w.label,
      current: w.currentPnl,
      projected: w.projectedPnl,
      advice: narrative?.advice || "",
      assumptions: narrative?.assumptions || `Based on ${w.tradeCount} trades`,
    }
  })

  return (
    <Card className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">What-if scenarios</h3>
      <p className="text-xs text-muted-foreground mb-3">Current vs projected P&L under filters</p>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">No scenarios available</p>
      ) : (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as (typeof data)[number]
                  return (
                    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-md max-w-[240px]">
                      <p className="font-semibold mb-1">{row.fullName}</p>
                      <p>Current: {formatInr(row.current)}</p>
                      <p>Projected: {formatInr(row.projected)}</p>
                      {row.assumptions && (
                        <p className="text-muted-foreground mt-1">{row.assumptions}</p>
                      )}
                      {row.advice && <p className="mt-1">{row.advice}</p>}
                    </div>
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="current" name="Current" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected" name="Projected" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
