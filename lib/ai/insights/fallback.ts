import { insightsPayloadSchema, type InsightsMetrics, type InsightsPayload } from "./types"

function rs(n: number): string {
  const r = Math.round(n)
  return `${r < 0 ? "-" : ""}Rs${Math.abs(r).toLocaleString("en-IN")}`
}

/**
 * Insights written entirely from computed metrics. Used when the model fails,
 * and field by field when the guardrail throws out something the model said.
 * Every number here comes straight from `metrics`, so it always verifies.
 */
export function fallbackFromMetrics(metrics: InsightsMetrics): InsightsPayload {
  const s = metrics.signals
  const bestStrat = metrics.strategies.find((b) => b.key === s?.bestStrategy) ?? metrics.strategies[0]
  const worstStrat =
    metrics.strategies.find((b) => b.key === s?.worstStrategy) ??
    (metrics.strategies.length > 1 ? metrics.strategies[metrics.strategies.length - 1] : undefined)
  const bestDay = metrics.dayOfWeek.find((b) => b.key === s?.bestDay) ?? metrics.dayOfWeek[0]
  const worstDay = metrics.dayOfWeek.find((b) => b.key === s?.worstDay)
  const topEmotion = metrics.emotions[0]
  const worstEmotion = metrics.emotions.length > 1 ? metrics.emotions[metrics.emotions.length - 1] : undefined
  const topMistake = metrics.mistakes[0]
  const tilt = metrics.afterLossStreaks.find((a) => a.count >= 2 && a.winRate < metrics.winRate)

  const strengths: string[] = []
  if (bestStrat && bestStrat.pnl > 0) strengths.push(`${bestStrat.key}: ${rs(bestStrat.pnl)} over ${bestStrat.count} trades`)
  if (bestDay && bestDay.pnl > 0) strengths.push(`${bestDay.key}s: ${bestDay.winRate}% win rate`)
  if ((metrics.profitFactor ?? 0) >= 1.2) strengths.push(`Profit factor ${metrics.profitFactor}`)
  if (strengths.length === 0) strengths.push("Building a trade sample")

  const weaknesses: string[] = []
  if (s?.isOvertrading) weaknesses.push(`4+ trade days win ${metrics.overtrading.highDayWR}% vs ${metrics.overtrading.lowDayWR}%`)
  if (topMistake && topMistake.totalPnl < 0) weaknesses.push(`${topMistake.mistake}: ${rs(topMistake.totalPnl)} across ${topMistake.count} trades`)
  if (worstStrat && worstStrat.pnl < 0) weaknesses.push(`${worstStrat.key}: ${rs(worstStrat.pnl)}`)
  if (weaknesses.length === 0) weaknesses.push("Need more data to spot a weakness")

  const rules: string[] = [`Cap the day at ${s?.recommendedMaxTrades ?? 3} trades unless an A+ setup appears.`]
  if (tilt) rules.push(`Stop for the day after ${tilt.streak} consecutive losses (next-trade win rate drops to ${tilt.winRate}%).`)
  else rules.push("Stop for the day after 2 consecutive losses.")
  if (s?.recommendedMinConfidence && s.recommendedMinConfidence > 1) {
    rules.push(`Only take setups rated ${s.recommendedMinConfidence}/5 confidence or higher.`)
  }
  if (worstStrat && worstStrat.pnl < 0) rules.push(`Size down on ${worstStrat.key} until it turns positive (${rs(worstStrat.pnl)} so far).`)
  if (worstEmotion && worstEmotion.pnl < 0 && worstEmotion.key !== "Unknown") {
    rules.push(`Skip trading when you feel ${worstEmotion.key.toLowerCase()} (${rs(worstEmotion.pnl)} in that state).`)
  }

  const capLoss = metrics.whatIf.find((w) => w.id === "cap-losses")

  return insightsPayloadSchema.parse({
    overallSummary: `Across ${metrics.totalTrades} trades you are at ${rs(metrics.totalPnl)} with a ${metrics.winRate}% win rate. Max drawdown is ${rs(metrics.maxDrawdown)} and Sharpe is ${metrics.sharpeRatio}.`,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    patterns: {
      bestSetup: bestStrat
        ? `${bestStrat.key} is your best setup at ${rs(bestStrat.pnl)} over ${bestStrat.count} trades.`
        : "Not enough strategy data yet.",
      worstSetup: worstStrat
        ? `${worstStrat.key} is your weakest setup at ${rs(worstStrat.pnl)} over ${worstStrat.count} trades.`
        : "Not enough strategy data yet.",
      bestDay: bestDay
        ? `${bestDay.key} is your strongest day at ${rs(bestDay.pnl)} with a ${bestDay.winRate}% win rate.`
        : "Not enough day data yet.",
      emotionalInsight: topEmotion
        ? `Trades tagged ${topEmotion.key} made ${rs(topEmotion.pnl)} across ${topEmotion.count} trades.`
        : "Tag emotions on more trades.",
      streakAnalysis: metrics.currentStreak
        ? `You are on a ${metrics.currentStreak}-trade ${metrics.streakType} streak; your longest losing run is ${metrics.longestLossStreak ?? 0} trades.`
        : "No active streak.",
    },
    confidenceCalibration: {
      finding: s
        ? `Confidence 4-5 trades win ${s.highConfWinRate}% vs ${metrics.winRate}% overall.`
        : "Not enough confidence data.",
      optimalConfidence: s?.recommendedMinConfidence ? `${s.recommendedMinConfidence}/5` : "",
      overconfidenceBias: s?.overconfidenceBias ?? false,
    },
    lossRecovery: {
      finding: metrics.recoveryInstances
        ? `After a bigger-than-average loss it takes ${metrics.avgRecoveryTrades} trades on average to get back to even.`
        : "No large-loss recoveries to measure yet.",
      avgTradesToRecover: metrics.avgRecoveryTrades,
      advice: "Pause after a large loss before re-entering.",
    },
    overtradingAnalysis: {
      finding:
        metrics.overtrading.highDays > 0
          ? `Days with 1-3 trades win ${metrics.overtrading.lowDayWR}% vs ${metrics.overtrading.highDayWR}% on 4+ trade days.`
          : "You have not had a 4+ trade day yet.",
      optimalTradesPerDay: `1-${s?.recommendedMaxTrades ?? 3}`,
      isOvertrading: s?.isOvertrading ?? false,
    },
    sequentialPatterns: {
      finding: tilt
        ? `After ${tilt.streak} consecutive losses your next trade wins ${tilt.winRate}% of the time.`
        : "No strong tilt pattern detected yet.",
      tiltRisk: s?.tiltRisk ?? "low",
      advice: "Stop for the day after 2 consecutive losses.",
    },
    whatIfScenarios: metrics.whatIf.map((w) => ({
      scenario: w.label,
      currentPnl: w.currentPnl,
      projectedPnl: w.projectedPnl,
      difference: w.difference,
      advice: w.difference > 0 ? "This filter would improve your results." : "This filter would not help.",
      assumptions: `Replays ${w.tradeCount} trades from your history.`,
    })),
    tradeDuration: {
      finding:
        metrics.duration.timedCount > 0
          ? `Trades held 1 hour or less win ${metrics.duration.shortWR}% vs ${metrics.duration.longWR}% for longer holds.`
          : "Log entry and exit times to analyse holding time.",
      optimalDuration: metrics.duration.shortWR >= metrics.duration.longWR ? "under 60 min" : "over 60 min",
      advice: "Favour the holding time with the higher win rate.",
    },
    personalizedRules: rules.slice(0, 5),
    performanceForecast: {
      projection: s
        ? `At ${rs(metrics.thisMonth.dailyAvg)} per trading day so far this month, you would finish near ${rs(s.monthEndProjection)}.`
        : "",
      monthEndTarget: s?.monthEndProjection ?? 0,
      confidence: s?.forecastConfidence ?? "low",
    },
    emotionalTrend: {
      finding: `Satisfaction went from ${metrics.emotionalTrend.avgSatFirst}/5 to ${metrics.emotionalTrend.avgSatSecond}/5 over your last 20 trades.`,
      trend: s?.emotionalTrend ?? "stable",
      burnoutRisk: "low",
      advice: "Protect your energy on high-trade days.",
    },
    riskScore: {
      overall: s?.riskScore ?? 50,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      assessment: `Max drawdown is ${rs(metrics.maxDrawdown)} against ${rs(metrics.totalPnl)} total P&L, with a Sharpe of ${metrics.sharpeRatio}.`,
      advice: capLoss && capLoss.difference > 0
        ? `Capping losses at your average loss would have added ${rs(capLoss.difference)}.`
        : "Keep risk per trade consistent and cut losers faster.",
    },
    actionItems: [
      { text: "Journal emotion and confidence on every trade", priority: "quick-win" },
      { text: `Enforce a ${s?.recommendedMaxTrades ?? 3}-trade daily cap`, priority: "high" },
      { text: "Review strategy expectancy every weekend", priority: "long-term" },
    ],
    traderLevel: s?.traderLevel ?? "beginner",
    confidenceScore: s?.compositeScore ?? 50,
  })
}
