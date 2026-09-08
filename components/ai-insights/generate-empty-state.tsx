"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Brain, Loader2, Sparkles } from "lucide-react"

export function GenerateEmptyState({
  summary,
  loading,
  onGenerate,
}: {
  summary?: string
  loading: boolean
  onGenerate: () => void
}) {
  return (
    <Card className="glass-card p-10 md:p-14 flex flex-col items-center text-center max-w-xl mx-auto">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Brain className="h-7 w-7 text-primary" />
      </div>
      <h2 className="font-display text-2xl tracking-tight text-foreground mb-2">
        AI Trading Coach
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md leading-relaxed">
        {summary ||
          "Generate a visual performance debrief from your journal — edge, behavior, risk, and a personal playbook."}
      </p>
      <Button onClick={onGenerate} disabled={loading} className="gap-2">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" /> Generate deep analysis
          </>
        )}
      </Button>
    </Card>
  )
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-64 bg-muted/50 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 glass-card rounded-xl bg-muted/30" />
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 h-40 glass-card rounded-xl bg-muted/30" />
        <div className="h-40 glass-card rounded-xl bg-muted/30" />
      </div>
      <div className="h-10 w-full max-w-md bg-muted/40 rounded-xl" />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-64 glass-card rounded-xl bg-muted/30" />
        <div className="h-64 glass-card rounded-xl bg-muted/30" />
      </div>
    </div>
  )
}
