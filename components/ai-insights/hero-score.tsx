"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const

function ConfidenceGauge({ score }: { score: number }) {
  const r = 64
  const sw = 9
  const circ = Math.PI * r
  const prog = (score / 100) * circ
  const clr = score >= 80 ? "#10b981" : score >= 60 ? "#6366f1" : score >= 40 ? "#f59e0b" : "#ef4444"

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="100" viewBox="0 0 160 100" aria-hidden>
        <path
          d={`M ${80 - r} 88 A ${r} ${r} 0 0 1 ${80 + r} 88`}
          fill="none"
          stroke="currentColor"
          className="text-muted/40"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M ${80 - r} 88 A ${r} ${r} 0 0 1 ${80 + r} 88`}
          fill="none"
          stroke={clr}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${prog} ${circ}`}
          className="transition-all duration-1000"
        />
        <text x="80" y="68" textAnchor="middle" className="fill-foreground font-bold" fontSize="28">
          {score}
        </text>
        <text x="80" y="86" textAnchor="middle" className="fill-muted-foreground" fontSize="10">
          / 100
        </text>
      </svg>
      <span className="text-xs font-medium text-muted-foreground -mt-1">AI Confidence</span>
    </div>
  )
}

function TraderLevel({ level }: { level: string }) {
  const idx = Math.max(0, LEVELS.indexOf(level.toLowerCase() as (typeof LEVELS)[number]))
  const pct = ((idx + 1) / LEVELS.length) * 100

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Trader level</span>
        <span className="font-semibold capitalize text-foreground">{level}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground capitalize">
        {LEVELS.map((l) => (
          <span key={l} className={cn(l === level.toLowerCase() && "text-primary font-medium")}>
            {l.slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function HeroScore({
  score,
  level,
}: {
  score: number
  level: string
}) {
  return (
    <Card className="glass-card p-5 flex flex-col items-center justify-center gap-3">
      <ConfidenceGauge score={score} />
      <TraderLevel level={level || "beginner"} />
    </Card>
  )
}
