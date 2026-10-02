import { Auditor, type EntityGroup } from "../guardrail/auditor"
import { buildInsightFacts } from "./facts"
import type { InsightTrade, InsightsMetrics, InsightsPayload } from "./types"

const MATCH_TOLERANCE = (v: number) => Math.max(2, Math.abs(v) * 0.01)

function entityGroups(m: InsightsMetrics): EntityGroup[] {
  const s = m.signals
  return [
    {
      nouns: ["day", "weekday", "trading day"],
      entities: m.dayOfWeek.map((d) => d.key),
      best: s?.bestDay ?? null,
      worst: s?.worstDay ?? null,
    },
    {
      nouns: ["setup", "strategy", "edge", "play", "system"],
      entities: m.strategies.map((d) => d.key).filter((k) => k !== "Unknown"),
      best: s?.bestStrategy ?? null,
      worst: s?.worstStrategy ?? null,
    },
    {
      nouns: ["window", "slot", "time", "hour", "session"],
      entities: (m.timeOfDay ?? []).map((d) => d.key),
      best: s?.bestTimeSlot ?? null,
      worst: s?.worstTimeSlot ?? null,
    },
  ]
}

/**
 * Check an AI insights payload against the metrics it was generated from and
 * return a repaired copy. Nothing the model says survives unless it can be
 * traced back to the data:
 *   - free-text numbers must match a computed value (FactSheet)
 *   - "best/worst X" must name the X the data ranks best/worst
 *   - verdicts (overtrading, tilt, bias, level, scores, forecast) are
 *     recomputed and overwrite whatever the model chose
 *   - what-if numbers must line up with a computed scenario
 *
 * `fallback` supplies deterministic replacements for anything removed.
 */
export function validateInsights(
  raw: InsightsPayload,
  metrics: InsightsMetrics,
  fallback: InsightsPayload,
  recent: InsightTrade[] = []
): { payload: InsightsPayload; auditor: Auditor } {
  const a = new Auditor(buildInsightFacts(metrics, recent), entityGroups(metrics))
  const s = metrics.signals
  const fb = fallback

  const patterns = raw.patterns ?? fb.patterns
  const cc = raw.confidenceCalibration ?? fb.confidenceCalibration!
  const lr = raw.lossRecovery ?? fb.lossRecovery!
  const ot = raw.overtradingAnalysis ?? fb.overtradingAnalysis!
  const sp = raw.sequentialPatterns ?? fb.sequentialPatterns!
  const td = raw.tradeDuration ?? fb.tradeDuration!
  const pf = raw.performanceForecast ?? fb.performanceForecast!
  const et = raw.emotionalTrend ?? fb.emotionalTrend!
  const rk = raw.riskScore ?? fb.riskScore!

  const payload: InsightsPayload = {
    overallSummary: a.text("overallSummary", raw.overallSummary, "strict", fb.overallSummary),
    strengths: a.list("strengths", raw.strengths, "strict", fb.strengths, 3),
    weaknesses: a.list("weaknesses", raw.weaknesses, "strict", fb.weaknesses, 3),
    patterns: {
      bestSetup: a.mustMention("patterns.bestSetup", patterns.bestSetup, s?.bestStrategy ?? null, fb.patterns.bestSetup),
      worstSetup: a.mustMention("patterns.worstSetup", patterns.worstSetup, s?.worstStrategy ?? null, fb.patterns.worstSetup),
      bestDay: a.mustMention("patterns.bestDay", patterns.bestDay, s?.bestDay ?? null, fb.patterns.bestDay),
      emotionalInsight: a.text("patterns.emotionalInsight", patterns.emotionalInsight, "strict", fb.patterns.emotionalInsight),
      streakAnalysis: a.text("patterns.streakAnalysis", patterns.streakAnalysis, "strict", fb.patterns.streakAnalysis),
    },
    confidenceCalibration: {
      finding: a.text("confidenceCalibration.finding", cc.finding, "strict", fb.confidenceCalibration!.finding),
      optimalConfidence: a.text("confidenceCalibration.optimalConfidence", cc.optimalConfidence, "lenient"),
      overconfidenceBias: s
        ? a.field("confidenceCalibration.overconfidenceBias", cc.overconfidenceBias, s.overconfidenceBias, {
            label: "Overconfidence flag",
          })
        : cc.overconfidenceBias,
    },
    lossRecovery: {
      finding: a.text("lossRecovery.finding", lr.finding, "strict", fb.lossRecovery!.finding),
      avgTradesToRecover: a.field("lossRecovery.avgTradesToRecover", lr.avgTradesToRecover, metrics.avgRecoveryTrades, {
        tolerance: 0.1,
        label: "Avg trades to recover",
      }),
      advice: a.text("lossRecovery.advice", lr.advice, "lenient"),
    },
    overtradingAnalysis: {
      finding: a.text("overtradingAnalysis.finding", ot.finding, "strict", fb.overtradingAnalysis!.finding),
      optimalTradesPerDay: a.text("overtradingAnalysis.optimalTradesPerDay", ot.optimalTradesPerDay, "lenient"),
      isOvertrading: s
        ? a.field("overtradingAnalysis.isOvertrading", ot.isOvertrading, s.isOvertrading, { label: "Overtrading flag" })
        : ot.isOvertrading,
    },
    sequentialPatterns: {
      finding: a.text("sequentialPatterns.finding", sp.finding, "strict", fb.sequentialPatterns!.finding),
      tiltRisk: s ? a.field("sequentialPatterns.tiltRisk", sp.tiltRisk, s.tiltRisk, { label: "Tilt risk" }) : sp.tiltRisk,
      advice: a.text("sequentialPatterns.advice", sp.advice, "lenient"),
    },
    whatIfScenarios: checkWhatIf(a, raw, metrics, fb),
    tradeDuration: {
      finding: a.text("tradeDuration.finding", td.finding, "strict", fb.tradeDuration!.finding),
      optimalDuration: a.text("tradeDuration.optimalDuration", td.optimalDuration, "lenient"),
      advice: a.text("tradeDuration.advice", td.advice, "lenient"),
    },
    personalizedRules: a.list("personalizedRules", raw.personalizedRules, "lenient", fb.personalizedRules, 5),
    performanceForecast: {
      projection: a.text("performanceForecast.projection", pf.projection, "strict", fb.performanceForecast!.projection),
      monthEndTarget: s
        ? a.field("performanceForecast.monthEndTarget", pf.monthEndTarget, s.monthEndProjection, {
            tolerance: Math.max(500, Math.abs(s.monthEndProjection) * 0.1),
            label: "Month-end target",
          })
        : pf.monthEndTarget,
      confidence: s
        ? a.field("performanceForecast.confidence", pf.confidence, s.forecastConfidence, {
            label: "Forecast confidence",
            severity: "warning",
          })
        : pf.confidence,
    },
    emotionalTrend: {
      finding: a.text("emotionalTrend.finding", et.finding, "strict", fb.emotionalTrend!.finding),
      trend: s ? a.field("emotionalTrend.trend", et.trend, s.emotionalTrend, { label: "Emotional trend" }) : et.trend,
      burnoutRisk: et.burnoutRisk,
      advice: a.text("emotionalTrend.advice", et.advice, "lenient"),
    },
    riskScore: {
      overall: s
        ? a.field("riskScore.overall", rk.overall, s.riskScore, { tolerance: 10, label: "Risk score", severity: "warning" })
        : rk.overall,
      maxDrawdown: a.field("riskScore.maxDrawdown", rk.maxDrawdown, metrics.maxDrawdown, {
        tolerance: MATCH_TOLERANCE(metrics.maxDrawdown),
        label: "Max drawdown",
      }),
      sharpeRatio: a.field("riskScore.sharpeRatio", rk.sharpeRatio, metrics.sharpeRatio, { tolerance: 0.01, label: "Sharpe" }),
      assessment: a.text("riskScore.assessment", rk.assessment, "strict", fb.riskScore!.assessment),
      advice: a.text("riskScore.advice", rk.advice, "lenient"),
    },
    actionItems: (raw.actionItems.length ? raw.actionItems : fb.actionItems).map((item, i) =>
      typeof item === "string"
        ? a.text(`actionItems[${i}]`, item, "lenient")
        : { ...item, text: a.text(`actionItems[${i}]`, item.text, "lenient") }
    ),
    traderLevel: s ? a.field("traderLevel", raw.traderLevel, s.traderLevel, { label: "Trader level" }) : raw.traderLevel,
    confidenceScore: s
      ? a.field("confidenceScore", raw.confidenceScore, s.compositeScore, {
          tolerance: 10,
          label: "Overall score",
          severity: "warning",
        })
      : raw.confidenceScore,
  }

  return { payload, auditor: a }
}

function checkWhatIf(
  a: Auditor,
  raw: InsightsPayload,
  metrics: InsightsMetrics,
  fb: InsightsPayload
): InsightsPayload["whatIfScenarios"] {
  const out: InsightsPayload["whatIfScenarios"] = []
  const used = new Set<string>()

  raw.whatIfScenarios.forEach((sc, i) => {
    const path = `whatIfScenarios[${i}]`
    const match = metrics.whatIf.find(
      (w) => !used.has(w.id) && Math.abs(w.projectedPnl - sc.projectedPnl) <= MATCH_TOLERANCE(w.projectedPnl)
    )
    if (!match) {
      a.note({
        path,
        kind: "unverified_number",
        severity: "error",
        message: `Scenario "${sc.scenario}" projects Rs${Math.round(sc.projectedPnl).toLocaleString("en-IN")}, which no replay of your trades produces.`,
        claim: String(sc.projectedPnl),
        action: "removed",
      })
      return
    }
    used.add(match.id)
    a.field(`${path}.currentPnl`, sc.currentPnl, match.currentPnl, { tolerance: MATCH_TOLERANCE(match.currentPnl), label: "Current P&L" })
    a.field(`${path}.difference`, sc.difference, match.difference, { tolerance: MATCH_TOLERANCE(match.difference), label: "Difference" })
    out.push({
      scenario: sc.scenario,
      currentPnl: match.currentPnl,
      projectedPnl: match.projectedPnl,
      difference: match.difference,
      advice: a.text(`${path}.advice`, sc.advice, "lenient"),
      assumptions: sc.assumptions ? a.text(`${path}.assumptions`, sc.assumptions, "strict") || undefined : undefined,
    })
  })

  return out.length > 0 ? out : fb.whatIfScenarios
}
