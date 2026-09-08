import type { InsightTrade, InsightsMetrics } from "./types"

function fmtBucket(
  label: string,
  items: { key: string; pnl: number; count: number; winRate: number }[],
  limit = 8
): string {
  if (items.length === 0) return `${label}: none`
  return (
    `${label}:\n` +
    items
      .slice(0, limit)
      .map((d) => `- ${d.key}: Rs${d.pnl} (${d.count} trades, ${d.winRate}% WR)`)
      .join("\n")
  )
}

export function buildPromptContext(metrics: InsightsMetrics, recent: InsightTrade[]): string {
  const lines: string[] = []

  lines.push("=== TRADER PERFORMANCE DATA ===")
  lines.push(`Total trades: ${metrics.totalTrades}`)
  lines.push(`Date range: ${metrics.dataRange.from} to ${metrics.dataRange.to}`)
  lines.push(`Unique trading days: ${metrics.dataRange.totalDays}`)
  lines.push(`Total PnL: Rs${metrics.totalPnl}`)
  lines.push(`Win rate: ${metrics.winRate}% (${metrics.winCount}W / ${metrics.lossCount}L)`)
  lines.push(`Avg PnL per trade: Rs${metrics.avgPnl}`)
  lines.push(`Biggest win: Rs${metrics.biggestWin} | Biggest loss: Rs${metrics.biggestLoss}`)
  lines.push(`Current streak: ${metrics.currentStreak} ${metrics.streakType}s`)
  lines.push("")

  lines.push("=== THIS MONTH ===")
  lines.push(
    `Trades: ${metrics.thisMonth.trades} | PnL: Rs${metrics.thisMonth.pnl} | Days: ${metrics.thisMonth.days} | Avg daily: Rs${metrics.thisMonth.dailyAvg}`
  )
  lines.push(`Last month: ${metrics.lastMonth.trades} trades | Rs${metrics.lastMonth.pnl}`)
  lines.push("")

  lines.push(fmtBucket("=== STRATEGY BREAKDOWN ===", metrics.strategies))
  lines.push("")
  lines.push(fmtBucket("=== DAY OF WEEK ===", metrics.dayOfWeek))
  lines.push("")
  lines.push(fmtBucket("=== EMOTIONAL STATE ===", metrics.emotions))
  lines.push("")

  lines.push("=== CONFIDENCE CALIBRATION ===")
  for (const c of metrics.confidenceBuckets) {
    lines.push(
      `- Confidence ${c.level}/5: ${c.count} trades, ${c.winRate}% WR, Rs${c.pnl} total`
    )
  }
  lines.push("")

  lines.push("=== LOSS RECOVERY ===")
  lines.push(`Avg trades to recover from big loss: ${metrics.avgRecoveryTrades}`)
  lines.push(`Recovery instances: ${metrics.recoveryInstances}`)
  lines.push("")

  lines.push("=== OVERTRADING ===")
  lines.push(
    `Days 1-3 trades: ${metrics.overtrading.lowDays} days, WR ${metrics.overtrading.lowDayWR}%, Avg PnL/day Rs${metrics.overtrading.lowDayAvgPnl}`
  )
  lines.push(
    `Days 4+ trades: ${metrics.overtrading.highDays} days, WR ${metrics.overtrading.highDayWR}%, Avg PnL/day Rs${metrics.overtrading.highDayAvgPnl}`
  )
  lines.push("")

  lines.push("=== SEQUENTIAL PATTERNS ===")
  if (metrics.afterLossStreaks.length === 0) {
    lines.push("- No significant loss streaks found")
  } else {
    for (const s of metrics.afterLossStreaks) {
      lines.push(`- After ${s.streak} consecutive losses: ${s.count} trades, ${s.winRate}% WR`)
    }
  }
  lines.push("")

  lines.push("=== WHAT-IF ===")
  for (const w of metrics.whatIf) {
    lines.push(
      `- ${w.label}: current Rs${w.currentPnl} → projected Rs${w.projectedPnl} (Δ Rs${w.difference}, ${w.tradeCount} trades)`
    )
  }
  lines.push("")

  lines.push("=== TRADE DURATION ===")
  lines.push(`Timed trades: ${metrics.duration.timedCount}`)
  lines.push(
    `Short (<=1hr): ${metrics.duration.shortCount} trades, ${metrics.duration.shortWR}% WR`
  )
  lines.push(
    `Long (>1hr): ${metrics.duration.longCount} trades, ${metrics.duration.longWR}% WR`
  )
  lines.push("")

  lines.push("=== EMOTIONAL TREND (last 20) ===")
  lines.push(
    `Satisfaction: ${metrics.emotionalTrend.avgSatFirst}/5 → ${metrics.emotionalTrend.avgSatSecond}/5`
  )
  lines.push(
    `Confidence: ${metrics.emotionalTrend.avgConfFirst}/5 → ${metrics.emotionalTrend.avgConfSecond}/5`
  )
  lines.push("")

  lines.push("=== RISK ===")
  lines.push(`Max drawdown: Rs${metrics.maxDrawdown}`)
  lines.push(`Sharpe ratio: ${metrics.sharpeRatio}`)
  lines.push("")

  lines.push("=== MISTAKES ===")
  if (metrics.mistakes.length === 0) {
    lines.push("- None tagged")
  } else {
    for (const m of metrics.mistakes) {
      lines.push(`- ${m.mistake}: ${m.count}x, total PnL Rs${m.totalPnl}`)
    }
  }
  lines.push("")

  lines.push("=== RECENT TRADES (sample) ===")
  for (const t of recent.slice(0, 8)) {
    let line = `- ${t.date} | ${t.symbol} ${t.type} | Rs${t.pnl} | ${t.strategy} | conf:${t.entryConfidence} | ${t.emotionalState || "?"}`
    if (t.mistakes.length) line += ` | mistakes: ${t.mistakes.join(", ")}`
    lines.push(line)
  }

  return lines.join("\n")
}

export function buildGenerationPrompt(metrics: InsightsMetrics, recent: InsightTrade[]): string {
  const context = buildPromptContext(metrics, recent)

  const jsonStructure = JSON.stringify(
    {
      overallSummary: "2 sentences max, honest, with numbers",
      strengths: ["short chip 1", "short chip 2", "short chip 3"],
      weaknesses: ["short chip 1", "short chip 2"],
      patterns: {
        bestSetup: "1 short sentence",
        worstSetup: "1 short sentence",
        bestDay: "1 short sentence",
        emotionalInsight: "1 short sentence",
        streakAnalysis: "1 short sentence",
      },
      confidenceCalibration: {
        finding: "1 sentence with numbers",
        optimalConfidence: "e.g. 4/5",
        overconfidenceBias: false,
      },
      lossRecovery: {
        finding: "1 sentence",
        avgTradesToRecover: metrics.avgRecoveryTrades,
        advice: "1 sentence",
      },
      overtradingAnalysis: {
        finding: "1 sentence",
        optimalTradesPerDay: "e.g. 1-3",
        isOvertrading: false,
      },
      sequentialPatterns: {
        finding: "1 sentence",
        tiltRisk: "low | medium | high",
        advice: "1 sentence",
      },
      whatIfScenarios: [
        {
          scenario: "short label",
          currentPnl: 0,
          projectedPnl: 0,
          difference: 0,
          advice: "1 sentence",
          assumptions: "brief basis",
        },
      ],
      tradeDuration: {
        finding: "1 sentence",
        optimalDuration: "e.g. under 60 min",
        advice: "1 sentence",
      },
      personalizedRules: ["Rule 1", "Rule 2", "Rule 3", "Rule 4", "Rule 5"],
      performanceForecast: {
        projection: "1-2 sentences with Rs amount and reasoning",
        monthEndTarget: 0,
        confidence: "low | medium | high",
      },
      emotionalTrend: {
        finding: "1 sentence",
        trend: "improving | declining | stable",
        burnoutRisk: "low | medium | high",
        advice: "1 sentence",
      },
      riskScore: {
        overall: 0,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        assessment: "1 sentence",
        advice: "1 sentence",
      },
      actionItems: [{ text: "Specific action", priority: "high | quick-win | long-term" }],
      traderLevel: "beginner | intermediate | advanced | expert",
      confidenceScore: 50,
    },
    null,
    2
  )

  return `You are an elite trading performance analyst. Analyze this trader's aggregate data and return deep, data-driven insights.

CRITICAL INSTRUCTIONS:
1. Keep every finding to ONE sentence when possible. Max 2 for overallSummary.
2. strengths/weaknesses: max 3 each, short phrases (not paragraphs).
3. personalizedRules: max 5, highest impact first, reference specific data.
4. actionItems: max 5, each with priority "high" | "quick-win" | "long-term".
5. whatIfScenarios: max 2, include assumptions.
6. TRADER LEVEL: beginner (<Rs50k total or <45% WR), intermediate (Rs50k-3L or inconsistent), advanced (Rs3L+ with decent risk), expert (Rs5L+ with strong metrics). Current total PnL Rs${metrics.totalPnl}, WR ${metrics.winRate}% over ${metrics.totalTrades} trades.
7. CONFIDENCE CALIBRATION: Only flag overconfidenceBias if HIGH confidence (4/5, 5/5) underperforms.
8. SHARPE: <0.5 poor, <1.0 below optimal, >1.0 good, >2.0 excellent. Current Sharpe ${metrics.sharpeRatio}.
9. Be specific with Rs amounts and percentages. Do NOT be generic.
10. Return ONLY valid JSON matching the structure.

${context}

Return ONLY valid JSON (no markdown, no code blocks) matching this structure:
${jsonStructure}`
}
