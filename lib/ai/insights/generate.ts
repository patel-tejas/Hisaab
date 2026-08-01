import { Groq } from "groq-sdk"
import { buildGenerationPrompt } from "./prompt"
import {
  GROQ_MODEL,
  GROQ_TIMEOUT_MS,
  insightsPayloadSchema,
  type InsightTrade,
  type InsightsMetrics,
  type InsightsPayload,
} from "./types"

function fallbackFromMetrics(metrics: InsightsMetrics): InsightsPayload {
  const bestStrat = metrics.strategies[0]
  const worstStrat = [...metrics.strategies].sort((a, b) => a.pnl - b.pnl)[0]
  const bestDay = metrics.dayOfWeek[0]

  return insightsPayloadSchema.parse({
    overallSummary: `Across ${metrics.totalTrades} trades you are at Rs${metrics.totalPnl} with a ${metrics.winRate}% win rate. Focus on tightening risk (max DD Rs${metrics.maxDrawdown}, Sharpe ${metrics.sharpeRatio}).`,
    strengths: bestStrat
      ? [`${bestStrat.key} edge (Rs${bestStrat.pnl}, ${bestStrat.winRate}% WR)`]
      : ["Building a trade sample"],
    weaknesses:
      metrics.overtrading.highDayWR < metrics.overtrading.lowDayWR
        ? ["Overtrading days underperform"]
        : metrics.mistakes[0]
          ? [`Recurring: ${metrics.mistakes[0].mistake}`]
          : ["Need more consistency data"],
    patterns: {
      bestSetup: bestStrat
        ? `${bestStrat.key} is your best setup (Rs${bestStrat.pnl}).`
        : "Not enough strategy data.",
      worstSetup: worstStrat
        ? `${worstStrat.key} drags performance (Rs${worstStrat.pnl}).`
        : "Not enough strategy data.",
      bestDay: bestDay
        ? `${bestDay.key} is your strongest day (Rs${bestDay.pnl}).`
        : "Not enough day data.",
      emotionalInsight:
        metrics.emotions[0]
          ? `${metrics.emotions[0].key} state shows Rs${metrics.emotions[0].pnl} across ${metrics.emotions[0].count} trades.`
          : "Tag emotions on more trades.",
      streakAnalysis: `Current ${metrics.currentStreak} ${metrics.streakType || "trade"} streak.`,
    },
    lossRecovery: {
      finding: `Avg recovery after big losses takes ${metrics.avgRecoveryTrades} trades.`,
      avgTradesToRecover: metrics.avgRecoveryTrades,
      advice: "Pause after a large loss before re-entering.",
    },
    overtradingAnalysis: {
      finding: `1-3 trade days WR ${metrics.overtrading.lowDayWR}% vs 4+ days ${metrics.overtrading.highDayWR}%.`,
      optimalTradesPerDay: "1-3",
      isOvertrading: metrics.overtrading.highDayWR + 5 < metrics.overtrading.lowDayWR,
    },
    sequentialPatterns: {
      finding:
        metrics.afterLossStreaks[0]
          ? `After ${metrics.afterLossStreaks[0].streak} losses, WR is ${metrics.afterLossStreaks[0].winRate}%.`
          : "No strong tilt pattern detected yet.",
      tiltRisk: "medium",
      advice: "Stop for the day after 2 consecutive losses.",
    },
    whatIfScenarios: metrics.whatIf.map((w) => ({
      scenario: w.label,
      currentPnl: w.currentPnl,
      projectedPnl: w.projectedPnl,
      difference: w.difference,
      advice: w.difference > 0 ? "This filter would improve expectancy." : "This filter may not help.",
      assumptions: `Based on ${w.tradeCount} trades in the analysis window.`,
    })),
    tradeDuration: {
      finding: `Short trades WR ${metrics.duration.shortWR}% vs long ${metrics.duration.longWR}%.`,
      optimalDuration:
        metrics.duration.shortWR >= metrics.duration.longWR ? "under 60 min" : "over 60 min",
      advice: "Favor your higher-WR duration bucket.",
    },
    personalizedRules: [
      "Cap daily trades at 3 unless A+ setup.",
      "Stop after 2 consecutive losses.",
      "Only take confidence ≥ 3 setups.",
      "Review biggest loss weekly.",
      "Size down when emotional state is negative.",
    ].slice(0, 5),
    performanceForecast: {
      projection: `At Rs${metrics.thisMonth.dailyAvg}/day this month, pace depends on staying selective.`,
      monthEndTarget: metrics.thisMonth.dailyAvg * 20,
      confidence: metrics.sharpeRatio >= 1 ? "medium" : "low",
    },
    emotionalTrend: {
      finding: `Satisfaction ${metrics.emotionalTrend.avgSatFirst} → ${metrics.emotionalTrend.avgSatSecond}; confidence ${metrics.emotionalTrend.avgConfFirst} → ${metrics.emotionalTrend.avgConfSecond}.`,
      trend:
        metrics.emotionalTrend.avgSatSecond > metrics.emotionalTrend.avgSatFirst + 0.3
          ? "improving"
          : metrics.emotionalTrend.avgSatSecond < metrics.emotionalTrend.avgSatFirst - 0.3
            ? "declining"
            : "stable",
      burnoutRisk: "low",
      advice: "Protect energy on high-trade days.",
    },
    riskScore: {
      overall: clampRisk(metrics),
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      assessment: `Max DD Rs${metrics.maxDrawdown} with Sharpe ${metrics.sharpeRatio}.`,
      advice: "Keep risk per trade consistent and cut losers faster.",
    },
    actionItems: [
      { text: "Journal emotion + confidence on every trade", priority: "quick-win" },
      { text: "Enforce a 2-loss daily stop", priority: "high" },
      { text: "Review weekly strategy expectancy", priority: "long-term" },
    ],
    traderLevel: inferLevel(metrics),
    confidenceScore: clamp(40 + metrics.winRate * 0.4 + Math.min(20, metrics.sharpeRatio * 10), 0, 100),
  })
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function clampRisk(metrics: InsightsMetrics): number {
  const base = 50
  const sharpeAdj = Math.min(30, metrics.sharpeRatio * 15)
  const ddPenalty = Math.min(40, metrics.maxDrawdown / Math.max(1, Math.abs(metrics.totalPnl)) * 40)
  return clamp(base - ddPenalty + sharpeAdj, 0, 100)
}

function inferLevel(metrics: InsightsMetrics): InsightsPayload["traderLevel"] {
  const pnl = metrics.totalPnl
  const wr = metrics.winRate
  if (pnl >= 500000 && wr >= 50 && metrics.sharpeRatio >= 1) return "expert"
  if (pnl >= 300000 && wr >= 48) return "advanced"
  if (pnl >= 50000 || wr >= 45) return "intermediate"
  return "beginner"
}

export async function generateInsights(
  metrics: InsightsMetrics,
  recentTrades: InsightTrade[],
  apiKey: string
): Promise<{ payload: InsightsPayload; model: string; usedFallback: boolean }> {
  const fallback = fallbackFromMetrics(metrics)
  const prompt = buildGenerationPrompt(metrics, recentTrades)

  const groq = new Groq({ apiKey })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)

  try {
    const result = await groq.chat.completions.create(
      {
        messages: [{ role: "user", content: prompt }],
        model: GROQ_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.4,
      },
      { signal: controller.signal }
    )

    const responseText = result.choices[0]?.message?.content?.trim() || "{}"
    let parsed: unknown
    try {
      parsed = JSON.parse(responseText)
    } catch {
      return { payload: fallback, model: GROQ_MODEL, usedFallback: true }
    }

    const validated = insightsPayloadSchema.safeParse(parsed)
    if (!validated.success) {
      // Merge partial LLM fields over metric fallbacks
      const merged = insightsPayloadSchema.parse({
        ...fallback,
        ...(typeof parsed === "object" && parsed ? parsed : {}),
      })
      return { payload: merged, model: GROQ_MODEL, usedFallback: true }
    }

    // Prefer deterministic risk numbers from metrics
    const payload: InsightsPayload = {
      ...validated.data,
      riskScore: {
        overall: validated.data.riskScore?.overall ?? clampRisk(metrics),
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        assessment: validated.data.riskScore?.assessment ?? fallback.riskScore!.assessment,
        advice: validated.data.riskScore?.advice ?? fallback.riskScore!.advice,
      },
      lossRecovery: {
        finding: validated.data.lossRecovery?.finding ?? fallback.lossRecovery!.finding,
        avgTradesToRecover: metrics.avgRecoveryTrades,
        advice: validated.data.lossRecovery?.advice ?? fallback.lossRecovery!.advice,
      },
    }

    return { payload, model: GROQ_MODEL, usedFallback: false }
  } catch (err) {
    console.error("Groq insights generation failed:", err)
    return { payload: fallback, model: GROQ_MODEL, usedFallback: true }
  } finally {
    clearTimeout(timer)
  }
}
