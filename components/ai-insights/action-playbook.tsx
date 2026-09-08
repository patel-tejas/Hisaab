"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle } from "lucide-react"
import type { InsightsPayload } from "@/lib/ai/insights"
import { normalizeActions } from "./format"

const CHECKS_KEY = "ai-action-checks-v2"

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  "quick-win": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "long-term": "bg-sky-500/10 text-sky-400 border-sky-500/20",
}

export function ActionPlaybook({
  insights,
}: {
  insights: InsightsPayload
}) {
  const actions = normalizeActions(insights.actionItems || [])
  const rules = (insights.personalizedRules || []).slice(0, 5)
  const patterns = insights.patterns

  const [checked, setChecked] = useState<boolean[]>(() => actions.map(() => false))

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKS_KEY)
      if (!raw) {
        setChecked(actions.map(() => false))
        return
      }
      const parsed = JSON.parse(raw) as boolean[]
      setChecked(actions.map((_, i) => Boolean(parsed[i])))
    } catch {
      setChecked(actions.map(() => false))
    }
  }, [actions.length])

  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      localStorage.setItem(CHECKS_KEY, JSON.stringify(next))
      return next
    })
  }

  const done = checked.filter(Boolean).length

  return (
    <div className="space-y-4">
      {patterns && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PatternTile label="Best setup" text={patterns.bestSetup} />
          <PatternTile label="Worst setup" text={patterns.worstSetup} />
          <PatternTile label="Best day" text={patterns.bestDay} />
          <PatternTile label="Emotion" text={patterns.emotionalInsight} />
          <PatternTile label="Streak" text={patterns.streakAnalysis} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Personal rulebook</h3>
          <ol className="space-y-2.5">
            {rules.map((rule, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-foreground leading-snug pt-0.5">{rule}</span>
              </li>
            ))}
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground">Rules will appear after generation.</p>
            )}
          </ol>
        </Card>

        <Card className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Action checklist</h3>
            <span className="text-xs text-muted-foreground tabular-nums">
              {done}/{actions.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: actions.length ? `${(done / actions.length) * 100}%` : "0%" }}
            />
          </div>
          <ul className="space-y-2">
            {actions.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="w-full flex items-start gap-2.5 text-left rounded-lg p-2 hover:bg-muted/40 transition-colors"
                >
                  {checked[i] ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "text-sm leading-snug block",
                        checked[i] ? "text-muted-foreground line-through" : "text-foreground"
                      )}
                    >
                      {item.text}
                    </span>
                    {item.priority && (
                      <span
                        className={cn(
                          "inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border",
                          PRIORITY_STYLE[item.priority] || PRIORITY_STYLE["long-term"]
                        )}
                      >
                        {item.priority}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {actions.length === 0 && (
              <p className="text-sm text-muted-foreground">No action items yet.</p>
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function PatternTile({ label, text }: { label: string; text: string }) {
  return (
    <Card className="glass-card p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-xs text-foreground leading-snug line-clamp-3">{text || "—"}</p>
    </Card>
  )
}
