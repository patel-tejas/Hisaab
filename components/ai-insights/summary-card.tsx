"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { truncateSentences } from "./format"
import type { InsightsPayload } from "@/lib/ai/insights"

export function SummaryCard({
  insights,
}: {
  insights: InsightsPayload
}) {
  const [expanded, setExpanded] = useState(false)
  const { short, hasMore } = truncateSentences(insights.overallSummary || "", 2)
  const forecast = insights.performanceForecast

  return (
    <Card className="glass-card p-5 relative overflow-hidden h-full">
      <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
        <Sparkles className="h-5 w-5" /> AI summary
      </h4>
      <p className="text-sm text-foreground leading-relaxed">
        {expanded ? insights.overallSummary : short}
      </p>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 px-2 text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read more"}
        </Button>
      )}
      {forecast?.projection && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
              Forecast
            </span>
            {forecast.confidence && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                {forecast.confidence} confidence
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{forecast.projection}</p>
        </div>
      )}
    </Card>
  )
}
