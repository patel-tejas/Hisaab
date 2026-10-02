import { timeSlot, tradeDay } from "../insights/compute-metrics"
import type { BucketStat, InsightTrade, InsightsMetrics } from "../insights/types"

export interface PlannerContext {
  todayName: string
  metrics: InsightsMetrics
  /** Stats for today's weekday across history. */
  today: BucketStat | null
  /** Strategy breakdown restricted to today's weekday. */
  todayStrategies: BucketStat[]
  /** Strategy picked for today: best on this weekday (2+ trades, profitable), else best overall. */
  focusStrategy: BucketStat | null
  /** A strategy with negative total P&L to avoid, if any. */
  avoidStrategy: BucketStat | null
  /** Profitable entry windows, best first. */
  goodWindows: BucketStat[]
}

function toBuckets(map: Record<string, { pnl: number; count: number; wins: number }>): BucketStat[] {
  return Object.entries(map)
    .map(([key, d]) => ({
      key,
      pnl: Math.round(d.pnl),
      count: d.count,
      wins: d.wins,
      winRate: d.count > 0 ? Math.round((d.wins / d.count) * 100) : 0,
    }))
    .sort((a, b) => b.pnl - a.pnl)
}

export function istWeekday(now: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(now)
}

export function buildPlannerContext(metrics: InsightsMetrics, trades: InsightTrade[], now: Date = new Date()): PlannerContext {
  const todayName = istWeekday(now)
  const map: Record<string, { pnl: number; count: number; wins: number }> = {}
  for (const t of trades) {
    if (tradeDay(t.date).weekday !== todayName) continue
    const k = t.strategy || "Unknown"
    if (!map[k]) map[k] = { pnl: 0, count: 0, wins: 0 }
    map[k].pnl += t.pnl
    map[k].count++
    if (t.pnl > 0) map[k].wins++
  }
  const todayStrategies = toBuckets(map)

  const s = metrics.signals
  const focusToday = todayStrategies.find((b) => b.count >= 2 && b.pnl > 0)
  const focusName = focusToday?.key ?? s?.bestStrategy ?? metrics.strategies[0]?.key
  const focusStrategy = metrics.strategies.find((b) => b.key === focusName) ?? null

  const losing = metrics.strategies.filter((b) => b.pnl < 0 && b.key !== focusStrategy?.key)
  const avoidStrategy =
    losing.find((b) => b.key === s?.worstStrategy) ?? (losing.length ? losing[losing.length - 1] : null)

  const goodWindows = (metrics.timeOfDay ?? []).filter((b) => b.pnl > 0)

  return {
    todayName,
    metrics,
    today: metrics.dayOfWeek.find((d) => d.key === todayName) ?? null,
    todayStrategies,
    focusStrategy,
    avoidStrategy,
    goodWindows,
  }
}

/** Map a model-written window like "09:15 - 10:30" onto the slot it starts in. */
export function windowToSlot(time: string): string | null {
  const m = time.match(/(\d{1,2})[:.](\d{2})/)
  if (!m) return null
  return timeSlot(`${m[1]}:${m[2]}`)
}
