"use client"

import { ShieldCheck } from "lucide-react"

import { Card } from "@/components/ui/card"
import { DISCIPLINE_MIN_TRADES, type DisciplineBand, type DisciplineScore as Score } from "@/lib/journal/discipline"
import { cn } from "@/lib/utils"

const BAND_TONE: Record<DisciplineBand, string> = {
  Strong: "text-[var(--success)]",
  Steady: "text-[var(--primary)]",
  Slipping: "text-[var(--warning)]",
  "Needs work": "text-[var(--destructive)]",
}

export function DisciplineScoreCard({ discipline }: { discipline: Score | null }) {
  const ready = discipline?.ready && discipline.score !== null && discipline.band !== null

  return (
    <Card className="glass-card relative gap-0 overflow-hidden p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
            <ShieldCheck className="size-5 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Discipline Score</h3>
            <p className="text-xs text-muted-foreground">
              {discipline ? `Across all ${discipline.tradeCount} trades` : "Rule-following, not P&L"}
            </p>
          </div>
        </div>

        {ready && discipline.band && (
          <div className="text-right">
            <span className={cn("numeric text-2xl font-bold", BAND_TONE[discipline.band])}>{discipline.score}</span>
            <span className="text-xs text-muted-foreground">/100</span>
            <p className={cn("text-xs font-medium", BAND_TONE[discipline.band])}>{discipline.band}</p>
          </div>
        )}
      </div>

      {!ready || !discipline ? (
        <p className="py-4 text-sm text-muted-foreground">
          Log at least {DISCIPLINE_MIN_TRADES} trades and your discipline score appears here. It scores how you trade, not whether
          you won.
        </p>
      ) : (
        <>
          <ul className="space-y-3.5">
            {discipline.components.map((c) => (
              <li key={c.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-foreground">{c.label}</span>
                  <span className="numeric text-sm font-semibold text-foreground">{c.value === null ? "n/a" : `${c.value}%`}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
            Weighted 30 / 30 / 25 / 15 in the order shown. A habit your journal can&apos;t measure is left out and the rest
            rescaled.
          </p>
        </>
      )}
    </Card>
  )
}
