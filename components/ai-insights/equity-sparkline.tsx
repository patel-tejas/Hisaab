"use client"

import { Card } from "@/components/ui/card"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { EquityPoint } from "@/lib/ai/insights"
import { formatInr } from "./format"

export function EquitySparkline({ data }: { data: EquityPoint[] }) {
  if (!data.length) {
    return (
      <Card className="glass-card p-5 h-[260px] flex items-center justify-center text-sm text-muted-foreground">
        Not enough trades for an equity curve yet.
      </Card>
    )
  }

  const positive = data[data.length - 1]?.cumulative >= 0

  return (
    <Card className="glass-card p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">Equity curve</h3>
        <p className="text-xs text-muted-foreground">Cumulative P&L over the analysis window</p>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aiEquityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={positive ? "#34d399" : "#f87171"}
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor={positive ? "#34d399" : "#f87171"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 10 }}
              className="text-muted-foreground"
              minTickGap={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 10 }}
              className="text-muted-foreground"
              width={56}
              tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [formatInr(value), "Cumulative"]}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={positive ? "#34d399" : "#f87171"}
              fill="url(#aiEquityGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
