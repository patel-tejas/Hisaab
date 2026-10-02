import { FactSheet } from "../guardrail/facts"
import type { BucketStat, InsightTrade, InsightsMetrics } from "./types"

export interface Comparison {
  label: string
  value: number
  unit: "Rs" | "%" | "pp" | "x"
}

/**
 * Comparisons the model is likely to want to make ("4+ trade days win 12pp
 * less often"). They are computed here and handed to the model, so it never
 * has to do arithmetic, and the guardrail accepts them as facts.
 */
export function buildComparisons(m: InsightsMetrics): Comparison[] {
  const out: Comparison[] = []
  const s = m.signals

  if (m.overtrading.lowDays > 0 && m.overtrading.highDays > 0) {
    out.push({ label: "Win-rate gap, 1-3 trade days vs 4+ trade days", value: m.overtrading.lowDayWR - m.overtrading.highDayWR, unit: "pp" })
    out.push({ label: "Avg P&L/day gap, 1-3 trade days vs 4+ trade days", value: m.overtrading.lowDayAvgPnl - m.overtrading.highDayAvgPnl, unit: "Rs" })
  }
  if (s && s.highConfTrades > 0) {
    out.push({ label: "Win-rate gap, confidence 4-5 vs overall", value: s.highConfWinRate - m.winRate, unit: "pp" })
  }
  if (m.duration.shortCount > 0 && m.duration.longCount > 0) {
    out.push({ label: "Win-rate gap, trades <=1hr vs >1hr", value: m.duration.shortWR - m.duration.longWR, unit: "pp" })
  }
  out.push({ label: "P&L change, this month vs last month", value: m.thisMonth.pnl - m.lastMonth.pnl, unit: "Rs" })
  if (m.lastMonth.pnl !== 0) {
    out.push({
      label: "P&L change %, this month vs last month",
      value: Math.round(((m.thisMonth.pnl - m.lastMonth.pnl) / Math.abs(m.lastMonth.pnl)) * 100),
      unit: "%",
    })
  }
  const best = m.strategies.find((b) => b.key === s?.bestStrategy)
  const worst = m.strategies.find((b) => b.key === s?.worstStrategy)
  if (best && worst) {
    out.push({ label: `P&L spread, ${best.key} vs ${worst.key}`, value: best.pnl - worst.pnl, unit: "Rs" })
  }
  const bestDay = m.dayOfWeek.find((b) => b.key === s?.bestDay)
  const worstDay = m.dayOfWeek.find((b) => b.key === s?.worstDay)
  if (bestDay && worstDay) {
    out.push({ label: `Win-rate gap, ${bestDay.key} vs ${worstDay.key}`, value: bestDay.winRate - worstDay.winRate, unit: "pp" })
  }
  for (const w of m.whatIf) {
    if (w.currentPnl !== 0) {
      out.push({ label: `What-if "${w.label}" change %`, value: Math.round((w.difference / Math.abs(w.currentPnl)) * 100), unit: "%" })
    }
  }
  return out
}

function addBuckets(f: FactSheet, name: string, buckets: BucketStat[] | undefined, total: number) {
  for (const b of buckets ?? []) {
    f.money(b.pnl, `${name} ${b.key} P&L`)
    if (b.count > 0) f.money(Math.round(b.pnl / b.count), `${name} ${b.key} avg P&L/trade`)
    f.count(b.count, `${name} ${b.key} trades`)
    f.count(b.wins, `${name} ${b.key} wins`)
    f.count(b.count - b.wins, `${name} ${b.key} non-wins`)
    f.percent(b.winRate, `${name} ${b.key} win rate`)
    f.percent(100 - b.winRate, `${name} ${b.key} loss rate`)
    if (total > 0) f.percent(Math.round((b.count / total) * 100), `${name} ${b.key} share of trades`)
  }
}

/** Every number the insights model is allowed to cite. */
export function buildInsightFacts(m: InsightsMetrics, recent: InsightTrade[] = []): FactSheet {
  const f = new FactSheet()
  const n = m.totalTrades

  f.money(m.totalPnl, "total P&L")
  f.money(m.avgPnl, "avg P&L/trade")
  f.money(m.biggestWin, "biggest win")
  f.money(m.biggestLoss, "biggest loss")
  f.money(m.maxDrawdown, "max drawdown")
  f.money(m.avgWin, "avg win")
  f.money(m.avgLoss, "avg loss")
  f.money(m.expectancy, "expectancy")
  f.money(m.thisMonth.pnl, "this month P&L")
  f.money(m.thisMonth.dailyAvg, "this month daily avg")
  f.money(m.lastMonth.pnl, "last month P&L")
  f.money(m.overtrading.lowDayAvgPnl, "1-3 trade day avg P&L")
  f.money(m.overtrading.highDayAvgPnl, "4+ trade day avg P&L")
  for (const w of m.whatIf) {
    f.money(w.currentPnl, `${w.label} current`)
    f.money(w.projectedPnl, `${w.label} projected`)
    f.money(w.difference, `${w.label} difference`)
    f.count(w.tradeCount, `${w.label} trades`)
  }
  for (const c of m.confidenceBuckets) {
    f.money(c.pnl, `confidence ${c.level} P&L`)
    if (c.count > 0) f.money(Math.round(c.pnl / c.count), `confidence ${c.level} avg P&L/trade`)
    f.count(c.count, `confidence ${c.level} trades`)
    f.percent(c.winRate, `confidence ${c.level} win rate`)
  }
  for (const mi of m.mistakes) {
    f.money(mi.totalPnl, `${mi.mistake} total P&L`)
    if (mi.count > 0) f.money(Math.round(mi.totalPnl / mi.count), `${mi.mistake} avg P&L`)
    f.count(mi.count, `${mi.mistake} occurrences`)
  }
  for (const t of recent.slice(0, 10)) f.money(t.pnl, `recent trade ${t.symbol} ${t.date}`)

  // Trader-level thresholds quoted in the prompt.
  f.money(50000, "level threshold").money(300000, "level threshold").money(500000, "level threshold")

  f.percent(m.winRate, "win rate")
  if (n > 0) {
    f.percent(Math.round((m.lossCount / n) * 100), "loss rate")
    f.percent(100 - m.winRate, "non-win rate")
  }
  f.percent(m.overtrading.lowDayWR, "1-3 trade day win rate")
  f.percent(m.overtrading.highDayWR, "4+ trade day win rate")
  f.percent(m.duration.shortWR, "<=1hr win rate")
  f.percent(m.duration.longWR, ">1hr win rate")
  for (const s of m.afterLossStreaks) {
    f.percent(s.winRate, `after ${s.streak} losses win rate`)
    f.count(s.count, `after ${s.streak} losses trades`)
    f.count(s.streak, "loss streak length")
  }

  addBuckets(f, "strategy", m.strategies, n)
  addBuckets(f, "day", m.dayOfWeek, n)
  addBuckets(f, "emotion", m.emotions, n)
  addBuckets(f, "time", m.timeOfDay, n)
  addBuckets(f, "symbol", m.symbols, n)

  f.count(n, "total trades")
  f.count(m.winCount, "wins")
  f.count(m.lossCount, "losses")
  f.count(m.lossCount + (m.breakevenCount ?? 0), "non-winning trades")
  f.count(m.breakevenCount, "breakeven trades")
  f.count(m.dataRange.totalDays, "trading days")
  f.count(m.overtrading.lowDays, "1-3 trade days")
  f.count(m.overtrading.highDays, "4+ trade days")
  f.count(m.thisMonth.trades, "this month trades")
  f.count(m.thisMonth.days, "this month days")
  f.count(m.lastMonth.trades, "last month trades")
  f.count(m.recoveryInstances, "recovery instances")
  f.count(m.currentStreak, "current streak")
  f.count(m.longestWinStreak, "longest win streak")
  f.count(m.longestLossStreak, "longest loss streak")
  f.count(m.duration.shortCount, "<=1hr trades")
  f.count(m.duration.longCount, ">1hr trades")
  f.count(m.duration.timedCount, "timed trades")
  f.count(60, "minutes in an hour")
  // Window sizes quoted in the prompt ("last 20 trades", halves of it, recent sample).
  f.count(20, "emotional trend window").count(10, "half of trend window")
  f.count(Math.min(8, recent.length), "recent trades shown")

  f.decimal(m.sharpeRatio, "Sharpe")
  f.decimal(m.profitFactor, "profit factor")
  f.decimal(m.payoffRatio, "payoff ratio")
  f.decimal(m.avgRecoveryTrades, "avg trades to recover")
  f.decimal(m.emotionalTrend.avgSatFirst, "satisfaction (earlier)")
  f.decimal(m.emotionalTrend.avgSatSecond, "satisfaction (recent)")
  f.decimal(m.emotionalTrend.avgConfFirst, "confidence (earlier)")
  f.decimal(m.emotionalTrend.avgConfSecond, "confidence (recent)")
  for (const t of [0.5, 1, 2]) f.decimal(t, "Sharpe threshold")

  const s = m.signals
  if (s) {
    f.percent(s.highConfWinRate, "confidence 4-5 win rate")
    f.count(s.highConfTrades, "confidence 4-5 trades")
    f.money(s.monthEndProjection, "month-end projection")
    f.count(s.remainingTradingDays, "trading days left this month")
    f.decimal(s.avgTradesPerDay, "avg trades per day")
    f.count(s.recommendedMaxTrades, "recommended max trades")
    f.count(s.minBucketTrades, "min trades per bucket")
  }

  for (const c of buildComparisons(m)) {
    if (c.unit === "Rs") f.money(c.value, c.label)
    else if (c.unit === "x") f.decimal(c.value, c.label)
    else f.percent(c.value, c.label)
  }

  return f
}
