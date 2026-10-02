import { buildComparisons } from "./facts"
import type { BucketStat, InsightTrade, InsightsMetrics } from "./types"

/** Money exactly as the model is asked to write it: -Rs1,23,456 */
export function rs(n: number): string {
  const r = Math.round(n)
  return `${r < 0 ? "-" : ""}Rs${Math.abs(r).toLocaleString("en-IN")}`
}

function fmtBucket(label: string, items: BucketStat[] | undefined, minTrades: number, limit = 8): string {
  if (!items || items.length === 0) return `${label}\n- none`
  return (
    `${label}\n` +
    items
      .slice(0, limit)
      .map((d) => {
        const avg = d.count > 0 ? rs(d.pnl / d.count) : rs(0)
        const small = d.count < minTrades ? " [small sample, do not rank]" : ""
        return `- ${d.key}: ${rs(d.pnl)} total, ${avg}/trade, ${d.count} trades, ${d.winRate}% WR${small}`
      })
      .join("\n")
  )
}

export const INSIGHTS_SYSTEM_PROMPT = `You are Hisaab's trading performance coach. You explain a trader's journal statistics in plain, direct language and turn them into concrete rules.

GROUNDING RULES (your answer is checked by code and anything that breaks these is deleted):
1. Every number you write must appear in the DATA block exactly as given, or be one of the PRE-COMPUTED COMPARISONS. Never add, subtract, average, annualise or extrapolate numbers yourself.
2. Write money as Rs followed by the full amount with Indian digit grouping, e.g. Rs12,345 or -Rs1,23,456. No k/L/Cr abbreviations.
3. Write win rates as whole percents (62%) and gaps as percentage points (8pp).
4. When you call something best or worst (setup, day, time window), use the one named in COMPUTED VERDICTS. Buckets marked [small sample] must not be called best or worst.
5. COMPUTED VERDICTS are final. Copy their values into the matching JSON fields and explain them; do not contradict them.
6. If the data cannot support a finding, say "Not enough data yet" instead of guessing.
7. Advice (rules, actionItems, *advice fields) may set new targets, but must be motivated by a number from the DATA.
8. No generic trading tips. Every sentence should be specific to this trader.
9. Output a single JSON object and nothing else.`

export function buildPromptContext(metrics: InsightsMetrics, recent: InsightTrade[]): string {
  const lines: string[] = []
  const s = metrics.signals
  const minTrades = s?.minBucketTrades ?? 1

  lines.push("=== OVERVIEW ===")
  lines.push(`Total trades: ${metrics.totalTrades} (${metrics.winCount} wins, ${metrics.lossCount} losses, ${metrics.breakevenCount ?? 0} breakeven)`)
  lines.push(`Date range: ${metrics.dataRange.from} to ${metrics.dataRange.to} (${metrics.dataRange.totalDays} trading days)`)
  lines.push(`Total P&L: ${rs(metrics.totalPnl)}`)
  lines.push(`Win rate: ${metrics.winRate}%`)
  lines.push(`Avg P&L per trade: ${rs(metrics.avgPnl)}`)
  lines.push(`Avg win: ${rs(metrics.avgWin ?? 0)} | Avg loss: ${rs(metrics.avgLoss ?? 0)} | Payoff ratio: ${metrics.payoffRatio ?? 0}`)
  lines.push(`Profit factor: ${metrics.profitFactor ?? 0} | Expectancy per trade: ${rs(metrics.expectancy ?? metrics.avgPnl)}`)
  lines.push(`Biggest win: ${rs(metrics.biggestWin)} | Biggest loss: ${rs(metrics.biggestLoss)}`)
  lines.push(`Current streak: ${metrics.currentStreak} ${metrics.streakType || "trade"}(s) | Longest win streak: ${metrics.longestWinStreak ?? 0} | Longest loss streak: ${metrics.longestLossStreak ?? 0}`)
  lines.push("")

  lines.push("=== THIS MONTH ===")
  lines.push(`Trades: ${metrics.thisMonth.trades} | P&L: ${rs(metrics.thisMonth.pnl)} | Trading days: ${metrics.thisMonth.days} | Avg per trading day: ${rs(metrics.thisMonth.dailyAvg)}`)
  lines.push(`Last month: ${metrics.lastMonth.trades} trades | ${rs(metrics.lastMonth.pnl)}`)
  if (s) lines.push(`Weekdays left this month: ${s.remainingTradingDays} | Month-end projection at current pace: ${rs(s.monthEndProjection)}`)
  lines.push("")

  lines.push(fmtBucket("=== STRATEGY BREAKDOWN ===", metrics.strategies, minTrades))
  lines.push("")
  lines.push(fmtBucket("=== DAY OF WEEK ===", metrics.dayOfWeek, minTrades))
  lines.push("")
  lines.push(fmtBucket("=== ENTRY TIME (IST) ===", metrics.timeOfDay, minTrades))
  lines.push("")
  lines.push(fmtBucket("=== SYMBOLS (top by P&L) ===", metrics.symbols, minTrades, 6))
  lines.push("")
  lines.push(fmtBucket("=== EMOTIONAL STATE ===", metrics.emotions, minTrades))
  lines.push("")

  lines.push("=== CONFIDENCE CALIBRATION ===")
  for (const c of metrics.confidenceBuckets) {
    lines.push(`- Confidence ${c.level}/5: ${c.count} trades, ${c.winRate}% WR, ${rs(c.pnl)} total`)
  }
  if (s) lines.push(`- Confidence 4-5 combined: ${s.highConfTrades} trades, ${s.highConfWinRate}% WR`)
  lines.push("")

  lines.push("=== LOSS RECOVERY ===")
  lines.push(`Avg trades to recover from a bigger-than-average loss: ${metrics.avgRecoveryTrades} (${metrics.recoveryInstances} instances)`)
  lines.push("")

  lines.push("=== TRADES PER DAY ===")
  lines.push(`Avg trades per trading day: ${s?.avgTradesPerDay ?? 0}`)
  lines.push(`Days with 1-3 trades: ${metrics.overtrading.lowDays} days, ${metrics.overtrading.lowDayWR}% WR, avg ${rs(metrics.overtrading.lowDayAvgPnl)}/day`)
  lines.push(`Days with 4+ trades: ${metrics.overtrading.highDays} days, ${metrics.overtrading.highDayWR}% WR, avg ${rs(metrics.overtrading.highDayAvgPnl)}/day`)
  lines.push("")

  lines.push("=== AFTER LOSING STREAKS ===")
  if (metrics.afterLossStreaks.length === 0) {
    lines.push("- No streaks of 2+ losses yet")
  } else {
    for (const st of metrics.afterLossStreaks) {
      lines.push(`- Next trade after ${st.streak} consecutive losses: ${st.count} trades, ${st.winRate}% WR`)
    }
  }
  lines.push("")

  lines.push("=== WHAT-IF REPLAYS ===")
  for (const w of metrics.whatIf) {
    lines.push(`- ${w.label}: current ${rs(w.currentPnl)} -> projected ${rs(w.projectedPnl)} (difference ${rs(w.difference)}, ${w.tradeCount} trades)`)
  }
  lines.push("")

  lines.push("=== HOLDING TIME ===")
  lines.push(`Trades with entry and exit time: ${metrics.duration.timedCount}`)
  lines.push(`Held 1 hour or less: ${metrics.duration.shortCount} trades, ${metrics.duration.shortWR}% WR`)
  lines.push(`Held over 1 hour: ${metrics.duration.longCount} trades, ${metrics.duration.longWR}% WR`)
  lines.push("")

  lines.push("=== EMOTIONAL TREND (last 20 trades, earlier half -> recent half) ===")
  lines.push(`Satisfaction: ${metrics.emotionalTrend.avgSatFirst}/5 -> ${metrics.emotionalTrend.avgSatSecond}/5`)
  lines.push(`Confidence: ${metrics.emotionalTrend.avgConfFirst}/5 -> ${metrics.emotionalTrend.avgConfSecond}/5`)
  lines.push("")

  lines.push("=== RISK ===")
  lines.push(`Max drawdown: ${rs(metrics.maxDrawdown)}`)
  lines.push(`Sharpe (per trade): ${metrics.sharpeRatio} (below 0.5 poor, below 1.0 below optimal, above 1.0 good, above 2.0 excellent)`)
  lines.push("")

  lines.push("=== MISTAKES (most costly first) ===")
  if (metrics.mistakes.length === 0) {
    lines.push("- None tagged")
  } else {
    for (const m of metrics.mistakes) {
      lines.push(`- ${m.mistake}: ${m.count} times, ${rs(m.totalPnl)} total`)
    }
  }
  lines.push("")

  const comparisons = buildComparisons(metrics)
  if (comparisons.length > 0) {
    lines.push("=== PRE-COMPUTED COMPARISONS ===")
    for (const c of comparisons) {
      const v = c.unit === "Rs" ? rs(c.value) : c.unit === "pp" ? `${c.value}pp` : c.unit === "%" ? `${c.value}%` : `${c.value}x`
      lines.push(`- ${c.label}: ${v}`)
    }
    lines.push("")
  }

  if (s) {
    lines.push("=== COMPUTED VERDICTS (final, copy into JSON) ===")
    lines.push(`- Best setup: ${s.bestStrategy ?? "n/a"} | Worst setup: ${s.worstStrategy ?? "n/a"}`)
    lines.push(`- Best day: ${s.bestDay ?? "n/a"} | Worst day: ${s.worstDay ?? "n/a"}`)
    lines.push(`- Best entry window: ${s.bestTimeSlot ?? "n/a"} | Worst entry window: ${s.worstTimeSlot ?? "n/a"}`)
    lines.push(`- Buckets need ${s.minBucketTrades}+ trades to be ranked`)
    lines.push(`- confidenceCalibration.overconfidenceBias: ${s.overconfidenceBias}`)
    lines.push(`- overtradingAnalysis.isOvertrading: ${s.isOvertrading}`)
    lines.push(`- sequentialPatterns.tiltRisk: ${s.tiltRisk}`)
    lines.push(`- emotionalTrend.trend: ${s.emotionalTrend}`)
    lines.push(`- traderLevel: ${s.traderLevel}`)
    lines.push(`- confidenceScore: ${s.compositeScore}`)
    lines.push(`- riskScore.overall: ${s.riskScore}`)
    lines.push(`- performanceForecast.monthEndTarget: ${s.monthEndProjection} (confidence: ${s.forecastConfidence})`)
    lines.push(`- Suggested daily trade cap: ${s.recommendedMaxTrades}`)
    if (s.recommendedMinConfidence) lines.push(`- Suggested minimum confidence: ${s.recommendedMinConfidence}/5`)
    lines.push(`- Sample size: ${s.sampleSize}`)
    lines.push("")
  }

  lines.push("=== MOST RECENT TRADES ===")
  for (const t of recent.slice(0, 8)) {
    let line = `- ${t.date} | ${t.symbol} ${t.type} | ${rs(t.pnl)} | ${t.strategy} | conf ${t.entryConfidence}/5 | ${t.emotionalState || "no emotion tagged"}`
    if (t.mistakes.length) line += ` | mistakes: ${t.mistakes.join(", ")}`
    lines.push(line)
  }

  return lines.join("\n")
}

function jsonShape(metrics: InsightsMetrics): string {
  const s = metrics.signals
  return JSON.stringify(
    {
      overallSummary: "2 sentences, honest, citing total P&L, win rate and the single biggest lever",
      strengths: ["short chip citing a number", "…max 3"],
      weaknesses: ["short chip citing a number", "…max 3"],
      patterns: {
        bestSetup: "1 sentence naming the best setup from COMPUTED VERDICTS",
        worstSetup: "1 sentence naming the worst setup from COMPUTED VERDICTS",
        bestDay: "1 sentence naming the best day from COMPUTED VERDICTS",
        emotionalInsight: "1 sentence",
        streakAnalysis: "1 sentence",
      },
      confidenceCalibration: {
        finding: "1 sentence with numbers",
        optimalConfidence: "e.g. 4/5",
        overconfidenceBias: s?.overconfidenceBias ?? false,
      },
      lossRecovery: {
        finding: "1 sentence",
        avgTradesToRecover: metrics.avgRecoveryTrades,
        advice: "1 sentence",
      },
      overtradingAnalysis: {
        finding: "1 sentence",
        optimalTradesPerDay: "e.g. 1-3",
        isOvertrading: s?.isOvertrading ?? false,
      },
      sequentialPatterns: {
        finding: "1 sentence",
        tiltRisk: s?.tiltRisk ?? "low",
        advice: "1 sentence",
      },
      whatIfScenarios: metrics.whatIf.map((w) => ({
        scenario: w.label,
        currentPnl: w.currentPnl,
        projectedPnl: w.projectedPnl,
        difference: w.difference,
        advice: "1 sentence",
        assumptions: "1 short phrase",
      })),
      tradeDuration: {
        finding: "1 sentence",
        optimalDuration: "e.g. under 60 min",
        advice: "1 sentence",
      },
      personalizedRules: ["Rule motivated by a number", "…max 5, highest impact first"],
      performanceForecast: {
        projection: "1-2 sentences using the month-end projection",
        monthEndTarget: s?.monthEndProjection ?? 0,
        confidence: s?.forecastConfidence ?? "low",
      },
      emotionalTrend: {
        finding: "1 sentence",
        trend: s?.emotionalTrend ?? "stable",
        burnoutRisk: "low | medium | high",
        advice: "1 sentence",
      },
      riskScore: {
        overall: s?.riskScore ?? 50,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        assessment: "1 sentence",
        advice: "1 sentence",
      },
      actionItems: [{ text: "Specific action", priority: "high | quick-win | long-term" }],
      traderLevel: s?.traderLevel ?? "beginner",
      confidenceScore: s?.compositeScore ?? 50,
    },
    null,
    2
  )
}

export function buildGenerationPrompt(metrics: InsightsMetrics, recent: InsightTrade[]): string {
  return `Analyse this trader's journal and return coaching insights.

DATA
${buildPromptContext(metrics, recent)}

Return one JSON object with exactly this shape. Numeric and verdict fields are pre-filled from COMPUTED VERDICTS; keep them.
${jsonShape(metrics)}`
}

/** Second-round prompt: show the model what the guardrail rejected. */
export function buildRepairPrompt(feedback: string): string {
  return `A code check compared your JSON with the data and found these problems:
${feedback}

Return the full JSON object again with these problems fixed. Use only numbers that appear in DATA or PRE-COMPUTED COMPARISONS, and the names in COMPUTED VERDICTS. If you cannot support a statement with the data, drop it.`
}
