"use client"

import { Card } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { InsightsMetrics, InsightsPayload } from "@/lib/ai/insights"
import { cn } from "@/lib/utils"
import { formatInr } from "./format"

export function ConfidenceChart({
  metrics,
  finding,
}: {
  metrics: InsightsMetrics
  finding?: string
}) {
  const data = metrics.confidenceBuckets.map((c) => ({
    name: `${c.level}/5`,
    winRate: c.winRate,
    pnl: c.pnl,
    count: c.count,
  }))

  return (
    <ChartCard title="Confidence calibration" finding={finding}>
      <BarChartBlock
        data={data}
        dataKey="winRate"
        color="#818cf8"
        yLabel="%"
        tooltipLabel="Win rate"
      />
    </ChartCard>
  )
}

export function EmotionChart({
  metrics,
  finding,
}: {
  metrics: InsightsMetrics
  finding?: string
}) {
  const data = metrics.emotions.slice(0, 6).map((e) => ({
    name: e.key.length > 10 ? `${e.key.slice(0, 9)}…` : e.key,
    full: e.key,
    pnl: e.pnl,
    winRate: e.winRate,
  }))

  return (
    <ChartCard title="Emotion vs P&L" finding={finding}>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(value: number) => [formatInr(value), "P&L"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ""}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.pnl >= 0 ? "#34d399" : "#f87171"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

export function OvertradingChart({
  metrics,
  finding,
}: {
  metrics: InsightsMetrics
  finding?: string
}) {
  const data = [
    {
      name: "1–3 trades",
      winRate: metrics.overtrading.lowDayWR,
      avgPnl: metrics.overtrading.lowDayAvgPnl,
      days: metrics.overtrading.lowDays,
    },
    {
      name: "4+ trades",
      winRate: metrics.overtrading.highDayWR,
      avgPnl: metrics.overtrading.highDayAvgPnl,
      days: metrics.overtrading.highDays,
    },
  ]

  return (
    <ChartCard title="Trade frequency" finding={finding}>
      <BarChartBlock
        data={data}
        dataKey="winRate"
        color="#34d399"
        yLabel="%"
        tooltipLabel="Win rate"
      />
    </ChartCard>
  )
}

export function TiltMeter({
  insights,
}: {
  insights?: InsightsPayload
}) {
  const level = insights?.sequentialPatterns?.tiltRisk || "medium"
  const finding = insights?.sequentialPatterns?.finding
  const advice = insights?.sequentialPatterns?.advice
  const pct = level === "low" ? 28 : level === "high" ? 86 : 55
  const color =
    level === "low" ? "bg-emerald-500" : level === "high" ? "bg-red-400" : "bg-amber-500"

  return (
    <Card className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Tilt risk</h3>
      <div className="mt-4 mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">After loss streaks</span>
        <span
          className={cn(
            "font-semibold capitalize",
            level === "low" && "text-emerald-500",
            level === "medium" && "text-amber-500",
            level === "high" && "text-red-400"
          )}
        >
          {level}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
      </div>
      {finding && <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{finding}</p>}
      {advice && <p className="text-xs text-foreground mt-2">{advice}</p>}
    </Card>
  )
}

export function MistakeCostChart({ metrics }: { metrics: InsightsMetrics }) {
  const data = metrics.mistakes.slice(0, 6).map((m) => ({
    name: m.mistake.length > 12 ? `${m.mistake.slice(0, 11)}…` : m.mistake,
    full: m.mistake,
    cost: Math.abs(m.totalPnl),
    pnl: m.totalPnl,
    count: m.count,
  }))

  return (
    <ChartCard title="Mistake cost" finding={undefined}>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No mistakes tagged yet</p>
      ) : (
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(_value: number, _n, item) => {
                  const pnl = (item.payload as { pnl: number }).pnl
                  return [formatInr(pnl), "Total P&L"]
                }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ""}
              />
              <Bar dataKey="cost" fill="#f87171" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

export function DurationChart({
  metrics,
  finding,
}: {
  metrics: InsightsMetrics
  finding?: string
}) {
  const data = [
    { name: "≤ 1 hr", winRate: metrics.duration.shortWR, count: metrics.duration.shortCount },
    { name: "> 1 hr", winRate: metrics.duration.longWR, count: metrics.duration.longCount },
  ]

  return (
    <ChartCard title="Hold duration" finding={finding}>
      <BarChartBlock
        data={data}
        dataKey="winRate"
        color="#a78bfa"
        yLabel="%"
        tooltipLabel="Win rate"
      />
    </ChartCard>
  )
}

function ChartCard({
  title,
  finding,
  children,
}: {
  title: string
  finding?: string
  children: React.ReactNode
}) {
  return (
    <Card className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {children}
      {finding && <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{finding}</p>}
    </Card>
  )
}

function BarChartBlock({
  data,
  dataKey,
  color,
  yLabel,
  tooltipLabel,
}: {
  data: Record<string, string | number>[]
  dataKey: string
  color: string
  yLabel: string
  tooltipLabel: string
}) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => `${v}${yLabel === "%" ? "" : ""}`}
            domain={yLabel === "%" ? [0, 100] : undefined}
          />
          <Tooltip formatter={(value: number) => [`${value}${yLabel === "%" ? "%" : ""}`, tooltipLabel]} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
