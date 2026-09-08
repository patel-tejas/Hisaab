"use client"

import { Card } from "@/components/ui/card"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts"
import type { SkillScores } from "@/lib/ai/insights"

export function SkillRadar({
  scores,
  strengths,
  weaknesses,
}: {
  scores: SkillScores
  strengths: string[]
  weaknesses: string[]
}) {
  const data = [
    { skill: "Risk", value: scores.risk },
    { skill: "Psychology", value: scores.psychology },
    { skill: "Consistency", value: scores.consistency },
    { skill: "Edge", value: scores.edge },
    { skill: "Discipline", value: scores.discipline },
  ]

  return (
    <Card className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Skill breakdown</h3>
      <p className="text-xs text-muted-foreground mb-3">Derived from your trade metrics</p>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="currentColor" className="text-border" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: "currentColor", fontSize: 11 }}
              className="text-muted-foreground"
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#818cf8"
              fill="#818cf8"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ChipList title="Strengths" items={strengths} tone="pos" />
        <ChipList title="Gaps" items={weaknesses} tone="warn" />
      </div>
    </Card>
  )
}

function ChipList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: "pos" | "warn"
}) {
  if (!items.length) return null
  return (
    <div>
      <p
        className={
          tone === "pos"
            ? "text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1.5"
            : "text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5"
        }
      >
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 3).map((item) => (
          <span
            key={item}
            className={
              tone === "pos"
                ? "text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15"
                : "text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/15"
            }
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
