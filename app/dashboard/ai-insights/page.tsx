"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AiInsightsApiResponse } from "@/lib/ai/insights"
import { HeroScore } from "@/components/ai-insights/hero-score"
import { KpiStrip } from "@/components/ai-insights/kpi-strip"
import { SummaryCard } from "@/components/ai-insights/summary-card"
import { EquitySparkline } from "@/components/ai-insights/equity-sparkline"
import { SkillRadar } from "@/components/ai-insights/skill-radar"
import { WhatIfChart } from "@/components/ai-insights/what-if-chart"
import {
  ConfidenceChart,
  DurationChart,
  EmotionChart,
  MistakeCostChart,
  OvertradingChart,
  TiltMeter,
} from "@/components/ai-insights/behavior-charts"
import { ActionPlaybook } from "@/components/ai-insights/action-playbook"
import {
  GenerateEmptyState,
  InsightsSkeleton,
} from "@/components/ai-insights/generate-empty-state"

type Tab = "overview" | "behavior" | "edge" | "playbook"

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "behavior", label: "Behavior", icon: Activity },
  { id: "edge", label: "Edge", icon: Shield },
  { id: "playbook", label: "Playbook", icon: BookOpen },
]

export default function AiInsightsPage() {
  const [data, setData] = useState<AiInsightsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("overview")

  const loadCached = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/ai-insights")
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to load insights")
      }
      const json = (await res.json()) as AiInsightsApiResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights")
    } finally {
      setLoading(false)
    }
  }, [])

  const generate = useCallback(async () => {
    setGenerating(true)
    setError("")
    try {
      const res = await fetch("/api/ai-insights", { method: "POST" })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error || "Failed to generate insights")
      }
      const json = (await res.json()) as AiInsightsApiResponse
      setData(json)
      if (json.rateLimited) {
        setError(json.summary || "Please wait before regenerating.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights")
    } finally {
      setGenerating(false)
    }
  }, [])

  useEffect(() => {
    loadCached()
  }, [loadCached])

  if (loading) {
    return (
      <div className="pb-10">
        <InsightsSkeleton />
      </div>
    )
  }

  if (!data?.ready || !data.metrics || !data.insights) {
    return (
      <div className="pb-10 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <GenerateEmptyState
          summary={data?.summary}
          loading={generating}
          onGenerate={generate}
        />
      </div>
    )
  }

  const { metrics, insights } = data
  const lastUpdated = data.generatedAt
    ? new Date(data.generatedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <div className="space-y-5 pb-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-1 flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            AI Trading Coach
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
            {metrics.dataRange && (
              <span>
                {metrics.dataRange.totalTrades} trades · {metrics.dataRange.from} –{" "}
                {metrics.dataRange.to}
              </span>
            )}
            {lastUpdated && (
              <span className="text-[10px] px-2 py-0.5 bg-muted/40 rounded-full">
                Updated {lastUpdated}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={generate}
          disabled={generating}
          className="gap-2 shrink-0 rounded-xl"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {data.stale && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Trades changed since this analysis. Refresh for an up-to-date coaching report.</span>
          </div>
          <Button size="sm" variant="outline" onClick={generate} disabled={generating} className="shrink-0">
            Regenerate
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {error}
        </div>
      )}

      <KpiStrip metrics={metrics} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <SummaryCard insights={insights} />
        </div>
        <HeroScore
          score={insights.confidenceScore ?? 50}
          level={insights.traderLevel || "beginner"}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon className="size-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <EquitySparkline data={metrics.equityCurve} />
          <SkillRadar
            scores={metrics.skillScores}
            strengths={insights.strengths || []}
            weaknesses={insights.weaknesses || []}
          />
        </div>
      )}

      {activeTab === "behavior" && (
        <div className="grid gap-4 md:grid-cols-2">
          <ConfidenceChart
            metrics={metrics}
            finding={insights.confidenceCalibration?.finding}
          />
          <EmotionChart
            metrics={metrics}
            finding={insights.emotionalTrend?.finding}
          />
          <OvertradingChart
            metrics={metrics}
            finding={insights.overtradingAnalysis?.finding}
          />
          <TiltMeter insights={insights} />
        </div>
      )}

      {activeTab === "edge" && (
        <div className="grid gap-4 md:grid-cols-2">
          <WhatIfChart metrics={metrics} scenarios={insights.whatIfScenarios} />
          <MistakeCostChart metrics={metrics} />
          <DurationChart
            metrics={metrics}
            finding={insights.tradeDuration?.finding}
          />
          {insights.riskScore && (
            <div className="glass-card rounded-xl border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Risk assessment</h3>
              <div className="flex items-end gap-3 mb-3">
                <span className="text-3xl font-semibold tabular-nums text-foreground">
                  {insights.riskScore.overall}
                </span>
                <span className="text-xs text-muted-foreground mb-1">/ 100 risk score</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {insights.riskScore.assessment}
              </p>
              <p className="text-xs text-foreground">{insights.riskScore.advice}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "playbook" && <ActionPlaybook insights={insights} />}
    </div>
  )
}
