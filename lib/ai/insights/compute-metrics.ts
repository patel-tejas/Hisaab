import type {
  BucketStat,
  ConfidenceBucket,
  EquityPoint,
  InsightSignals,
  InsightTrade,
  InsightsMetrics,
  RiskLevel,
  SkillScores,
  TraderLevel,
} from "./types"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/**
 * trade_date is a plain `YYYY-MM-DD`. `new Date("2026-09-01")` is UTC midnight,
 * so read it back in UTC too; local getters shift the weekday for anyone west
 * of UTC.
 */
export function tradeDay(date: string): { key: string; weekday: string; monthKey: string; time: number } {
  const key = date.slice(0, 10)
  const d = new Date(`${key}T00:00:00Z`)
  return {
    key,
    weekday: DAY_NAMES[d.getUTCDay()] ?? "Unknown",
    monthKey: key.slice(0, 7),
    time: d.getTime(),
  }
}

/** Entry-time slot for Indian market hours (09:15–15:30 IST). */
export function timeSlot(entryTime: string | null): string | null {
  if (!entryTime) return null
  const hour = parseInt(entryTime.split(":")[0], 10)
  if (!Number.isFinite(hour)) return null
  if (hour < 10) return "09:00-10:00"
  if (hour < 11) return "10:00-11:00"
  if (hour < 12) return "11:00-12:00"
  if (hour < 13) return "12:00-13:00"
  if (hour < 14) return "13:00-14:00"
  return "14:00-15:30"
}

type Agg = Record<string, { pnl: number; count: number; wins: number }>

function bump(map: Agg, key: string, pnl: number) {
  if (!map[key]) map[key] = { pnl: 0, count: 0, wins: 0 }
  map[key].pnl += pnl
  map[key].count++
  if (pnl > 0) map[key].wins++
}

/**
 * Best and worst bucket by total P&L, ignoring buckets with too few trades
 * to mean anything. Falls back to every bucket when none qualify.
 */
export function bestWorst(buckets: BucketStat[], minTrades: number): { best: string | null; worst: string | null } {
  const eligible = buckets.filter((b) => b.count >= minTrades)
  const pool = eligible.length > 0 ? eligible : buckets
  if (pool.length === 0) return { best: null, worst: null }
  const sorted = [...pool].sort((a, b) => b.pnl - a.pnl)
  return {
    best: sorted[0].key,
    worst: sorted.length > 1 ? sorted[sorted.length - 1].key : null,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function weekdaysLeftInMonth(now: Date): number {
  let count = 0
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  while (d.getMonth() === now.getMonth()) {
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

export function inferTraderLevel(m: { totalPnl: number; winRate: number; sharpeRatio: number }): TraderLevel {
  if (m.totalPnl >= 500000 && m.winRate >= 50 && m.sharpeRatio >= 1) return "expert"
  if (m.totalPnl >= 300000 && m.winRate >= 48) return "advanced"
  if (m.totalPnl >= 50000 || m.winRate >= 45) return "intermediate"
  return "beginner"
}

export function riskHealthScore(m: { sharpeRatio: number; maxDrawdown: number; totalPnl: number }): number {
  const sharpeAdj = Math.min(30, m.sharpeRatio * 15)
  const ddPenalty = Math.min(40, (m.maxDrawdown / Math.max(1, Math.abs(m.totalPnl))) * 40)
  return clampScore(50 - ddPenalty + sharpeAdj)
}

function toBucket(map: Agg): BucketStat[] {
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

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function deriveSkillScores(m: {
  winRate: number
  sharpe: number
  maxDrawdown: number
  totalPnl: number
  overtradingGap: number
  tiltRiskScore: number
  confCalibration: number
  mistakeRate: number
}): SkillScores {
  return {
    risk: clampScore(40 + m.sharpe * 25 - Math.min(40, m.maxDrawdown / Math.max(1, Math.abs(m.totalPnl)) * 40)),
    psychology: clampScore(70 - m.tiltRiskScore * 20 + m.confCalibration * 0.3),
    consistency: clampScore(m.winRate * 0.7 + Math.min(30, Math.abs(m.sharpe) * 15)),
    edge: clampScore(m.winRate * 0.5 + (m.totalPnl > 0 ? 30 : 10) + Math.min(20, m.sharpe * 10)),
    discipline: clampScore(80 - m.overtradingGap * 0.4 - m.mistakeRate * 40),
  }
}

export function computeMetrics(trades: InsightTrade[], now: Date = new Date()): InsightsMetrics {
  if (trades.length === 0) {
    return emptyMetrics()
  }

  const chronological = [...trades].sort(
    (a, b) => tradeDay(a.date).time - tradeDay(b.date).time || a.id.localeCompare(b.id)
  )

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  const thisMonthKey = monthKey(now)
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))

  let totalPnl = 0
  let winCount = 0
  let lossCount = 0
  let breakevenCount = 0
  let grossProfit = 0
  let grossLoss = 0
  let biggestWin = -Infinity
  let biggestLoss = Infinity
  let sumSq = 0

  const stratMap: Agg = {}
  const dayMap: Agg = {}
  const emotionMap: Agg = {}
  const slotMap: Agg = {}
  const symbolMap: Agg = {}
  const confMap: Record<number, { count: number; wins: number; pnl: number }> = {}
  const dateTradeMap: Record<string, { count: number; pnl: number; wins: number }> = {}
  const mistakeAgg: Record<string, { count: number; totalPnl: number }> = {}

  const equityCurve: EquityPoint[] = []
  let running = 0
  let peak = 0
  let maxDrawdown = 0

  const losses: number[] = []

  // Sequential / tilt
  const afterLossStreak: Record<number, { wins: number; count: number }> = {}
  let lossStreak = 0
  let winRun = 0
  let longestWinStreak = 0
  let longestLossStreak = 0

  // Duration
  let shortWins = 0, shortCount = 0, longWins = 0, longCount = 0

  // Month
  let thisMonthTrades = 0, thisMonthPnl = 0
  const thisMonthDays = new Set<string>()
  let lastMonthTrades = 0, lastMonthPnl = 0

  for (const t of chronological) {
    const pnl = t.pnl
    totalPnl += pnl
    if (pnl > 0) {
      winCount++
      grossProfit += pnl
    } else if (pnl < 0) {
      lossCount++
      grossLoss += -pnl
    } else {
      breakevenCount++
    }
    if (pnl > biggestWin) biggestWin = pnl
    if (pnl < biggestLoss) biggestLoss = pnl
    if (pnl < 0) losses.push(pnl)

    const td = tradeDay(t.date)

    // Strategy / day / emotion / time / symbol / confidence
    bump(stratMap, t.strategy || "Unknown", pnl)
    bump(dayMap, td.weekday, pnl)
    bump(emotionMap, t.emotionalState || "Unknown", pnl)
    const slot = timeSlot(t.entryTime)
    if (slot) bump(slotMap, slot, pnl)
    if (t.symbol) bump(symbolMap, t.symbol.toUpperCase(), pnl)

    const conf = t.entryConfidence || 3
    if (!confMap[conf]) confMap[conf] = { count: 0, wins: 0, pnl: 0 }
    confMap[conf].count++
    confMap[conf].pnl += pnl
    if (pnl > 0) confMap[conf].wins++

    const dayKey = td.key
    if (!dateTradeMap[dayKey]) dateTradeMap[dayKey] = { count: 0, pnl: 0, wins: 0 }
    dateTradeMap[dayKey].count++
    dateTradeMap[dayKey].pnl += pnl
    if (pnl > 0) dateTradeMap[dayKey].wins++

    for (const m of t.mistakes) {
      if (!mistakeAgg[m]) mistakeAgg[m] = { count: 0, totalPnl: 0 }
      mistakeAgg[m].count++
      mistakeAgg[m].totalPnl += pnl
    }

    // Equity / drawdown
    running += pnl
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDrawdown) maxDrawdown = dd
    equityCurve.push({
      date: t.date,
      pnl: Math.round(pnl),
      cumulative: Math.round(running),
    })

    // Tilt after loss streaks
    if (lossStreak >= 2) {
      if (!afterLossStreak[lossStreak]) afterLossStreak[lossStreak] = { wins: 0, count: 0 }
      afterLossStreak[lossStreak].count++
      if (pnl > 0) afterLossStreak[lossStreak].wins++
    }
    if (pnl <= 0) {
      lossStreak++
      winRun = 0
    } else {
      lossStreak = 0
      winRun++
    }
    if (lossStreak > longestLossStreak) longestLossStreak = lossStreak
    if (winRun > longestWinStreak) longestWinStreak = winRun

    // Duration
    if (t.entryTime && t.exitTime) {
      const [eh, em] = t.entryTime.split(":").map(Number)
      const [xh, xm] = t.exitTime.split(":").map(Number)
      let mins = xh * 60 + xm - (eh * 60 + em)
      if (mins < 0) mins += 1440
      if (mins > 0) {
        if (mins <= 60) {
          shortCount++
          if (pnl > 0) shortWins++
        } else {
          longCount++
          if (pnl > 0) longWins++
        }
      }
    }

    // Month buckets
    const mk = td.monthKey
    if (mk === thisMonthKey) {
      thisMonthTrades++
      thisMonthPnl += pnl
      thisMonthDays.add(dayKey)
    } else if (mk === lastMonthKey) {
      lastMonthTrades++
      lastMonthPnl += pnl
    }
  }

  // Loss recovery: linear open-set walk (O(n) amortized) once avg-loss threshold is known
  const avgLossAbs =
    losses.length > 0 ? Math.abs(losses.reduce((s, v) => s + v, 0) / losses.length) : 0
  const recoveryData: number[] = []
  if (avgLossAbs > 0) {
    const openRecoveries: { remaining: number; count: number }[] = []
    for (const t of chronological) {
      for (let i = openRecoveries.length - 1; i >= 0; i--) {
        openRecoveries[i].remaining += t.pnl
        openRecoveries[i].count++
        if (openRecoveries[i].remaining >= 0) {
          recoveryData.push(openRecoveries[i].count)
          openRecoveries.splice(i, 1)
        }
      }
      if (t.pnl < -avgLossAbs) {
        openRecoveries.push({ remaining: t.pnl, count: 0 })
      }
    }
  }

  const n = trades.length
  const mean = totalPnl / n
  for (const t of chronological) {
    sumSq += Math.pow(t.pnl - mean, 2)
  }
  const stdDev = Math.sqrt(sumSq / n)
  const sharpe = stdDev > 0 ? Math.round((mean / stdDev) * 100) / 100 : 0
  const winRate = Math.round((winCount / n) * 100)
  const avgPnl = Math.round(totalPnl / n)

  // Current streak (from newest)
  let currentStreak = 0
  let streakType: "win" | "loss" | "" = ""
  const newestFirst = [...chronological].reverse()
  for (const t of newestFirst) {
    if (currentStreak === 0) {
      streakType = t.pnl > 0 ? "win" : "loss"
      currentStreak = 1
    } else if (
      (streakType === "win" && t.pnl > 0) ||
      (streakType === "loss" && t.pnl <= 0)
    ) {
      currentStreak++
    } else break
  }

  const dayEntries = Object.values(dateTradeMap)
  const lowDays = dayEntries.filter((d) => d.count <= 3)
  const highDays = dayEntries.filter((d) => d.count > 3)
  const lowDayWR =
    lowDays.length > 0
      ? Math.round(
          (lowDays.reduce((s, d) => s + d.wins, 0) /
            Math.max(1, lowDays.reduce((s, d) => s + d.count, 0))) *
            100
        )
      : 0
  const highDayWR =
    highDays.length > 0
      ? Math.round(
          (highDays.reduce((s, d) => s + d.wins, 0) /
            Math.max(1, highDays.reduce((s, d) => s + d.count, 0))) *
            100
        )
      : 0
  const lowDayAvgPnl =
    lowDays.length > 0
      ? Math.round(lowDays.reduce((s, d) => s + d.pnl, 0) / lowDays.length)
      : 0
  const highDayAvgPnl =
    highDays.length > 0
      ? Math.round(highDays.reduce((s, d) => s + d.pnl, 0) / highDays.length)
      : 0

  const avgLoss =
    losses.length > 0 ? Math.round(losses.reduce((s, v) => s + v, 0) / losses.length) : 0
  const whatIfCutLoss = Math.round(
    chronological.reduce((s, t) => s + (t.pnl < avgLoss ? avgLoss : t.pnl), 0)
  )
  const confAbove3 = chronological.filter((t) => (t.entryConfidence || 3) >= 3)
  const whatIfHighConf = Math.round(confAbove3.reduce((s, t) => s + t.pnl, 0))

  const last20 = chronological.slice(-20)
  const first10 = last20.slice(0, 10)
  const second10 = last20.slice(-10)
  const avg = (arr: InsightTrade[], key: "satisfaction" | "entryConfidence") =>
    arr.length > 0
      ? Math.round((arr.reduce((s, t) => s + (t[key] || 3), 0) / arr.length) * 10) / 10
      : 0

  const confidenceBuckets: ConfidenceBucket[] = Object.entries(confMap)
    .map(([level, d]) => ({
      level: Number(level),
      count: d.count,
      wins: d.wins,
      pnl: Math.round(d.pnl),
      winRate: d.count > 0 ? Math.round((d.wins / d.count) * 100) : 0,
    }))
    .sort((a, b) => a.level - b.level)

  // Calibration: high conf (4-5) WR vs overall
  const highConf = confidenceBuckets.filter((c) => c.level >= 4)
  const highConfWR =
    highConf.reduce((s, c) => s + c.wins, 0) /
    Math.max(1, highConf.reduce((s, c) => s + c.count, 0))
  const confCalibration = clampScore(highConfWR * 100)

  const tiltEntries = Object.values(afterLossStreak)
  const tiltRiskScore =
    tiltEntries.length === 0
      ? 0
      : tiltEntries.some((d) => d.count > 0 && d.wins / d.count < 0.4)
        ? 3
        : tiltEntries.some((d) => d.count > 0 && d.wins / d.count < 0.5)
          ? 2
          : 1

  const mistakeCount = Object.values(mistakeAgg).reduce((s, m) => s + m.count, 0)
  const mistakeRate = mistakeCount / n
  const overtradingGap = Math.max(0, lowDayWR - highDayWR)

  const tradeDates = chronological.map((t) => tradeDay(t.date).time)
  const earliest = new Date(Math.min(...tradeDates))
  const latest = new Date(Math.max(...tradeDates))
  const uniqueDays = dayEntries.length

  const avgRecoveryTrades =
    recoveryData.length > 0
      ? Math.round((recoveryData.reduce((s, v) => s + v, 0) / recoveryData.length) * 10) / 10
      : 0

  const thisMonthDailyAvg =
    thisMonthDays.size > 0 ? Math.round(thisMonthPnl / thisMonthDays.size) : 0

  const strategies = toBucket(stratMap)
  const dayOfWeek = toBucket(dayMap)
  const timeOfDay = toBucket(slotMap)
  const symbols = toBucket(symbolMap).slice(0, 10)

  const avgWin = winCount > 0 ? Math.round(grossProfit / winCount) : 0
  const avgLossAbsRounded = lossCount > 0 ? Math.round(grossLoss / lossCount) : 0
  const profitFactor = grossLoss > 0 ? round2(grossProfit / grossLoss) : 0
  const payoffRatio = avgLossAbsRounded > 0 ? round2(avgWin / avgLossAbsRounded) : 0
  const expectancy = Math.round(
    (winCount / n) * (winCount > 0 ? grossProfit / winCount : 0) -
      (lossCount / n) * (lossCount > 0 ? grossLoss / lossCount : 0)
  )

  const skillScores = deriveSkillScores({
    winRate,
    sharpe,
    maxDrawdown: Math.round(maxDrawdown),
    totalPnl: Math.round(totalPnl),
    overtradingGap,
    tiltRiskScore,
    confCalibration,
    mistakeRate,
  })

  // ── Verdicts computed in code (the model explains them, it does not decide them) ──
  const minBucketTrades = n >= 30 ? 5 : n >= 10 ? 3 : 1
  const strat = bestWorst(strategies, minBucketTrades)
  const days = bestWorst(dayOfWeek, minBucketTrades)
  const slots = bestWorst(timeOfDay, minBucketTrades)

  const highConfTrades = highConf.reduce((s, c) => s + c.count, 0)
  const highConfWinRate = Math.round(highConfWR * 100)
  const overconfidenceBias = highConfTrades >= 3 && highConfWinRate + 5 < winRate

  const isOvertrading = highDays.length > 0 && highDayWR + 5 < lowDayWR

  const tiltRisk: RiskLevel = tiltRiskScore >= 3 ? "high" : tiltRiskScore === 2 ? "medium" : "low"

  const satFirst = avg(first10, "satisfaction")
  const satSecond = avg(second10, "satisfaction")
  const emotionalTrend =
    satSecond > satFirst + 0.3 ? "improving" : satSecond < satFirst - 0.3 ? "declining" : "stable"

  const totalPnlRounded = Math.round(totalPnl)
  const remainingTradingDays = weekdaysLeftInMonth(now)
  const monthEndProjection = Math.round(thisMonthPnl + thisMonthDailyAvg * remainingTradingDays)
  const forecastConfidence: RiskLevel =
    thisMonthDays.size < 5 ? "low" : thisMonthDays.size >= 10 && sharpe >= 0.2 ? "medium" : "low"

  const avgTradesPerDay = dayEntries.length > 0 ? Math.round((n / dayEntries.length) * 10) / 10 : 0
  const recommendedMaxTrades = Math.max(
    1,
    Math.min(10, isOvertrading ? 3 : Math.max(1, Math.round(avgTradesPerDay)))
  )

  // Lowest confidence floor that maximises P&L while keeping a meaningful sample.
  let recommendedMinConfidence: number | null = null
  let bestFloorPnl = -Infinity
  const floorSample = Math.max(3, Math.round(n * 0.2))
  for (let level = 1; level <= 5; level++) {
    const kept = chronological.filter((t) => (t.entryConfidence || 3) >= level)
    if (kept.length < floorSample) break
    const p = kept.reduce((s, t) => s + t.pnl, 0)
    if (p > bestFloorPnl) {
      bestFloorPnl = p
      recommendedMinConfidence = level
    }
  }

  const scores = Object.values(skillScores)
  const signals: InsightSignals = {
    bestStrategy: strat.best,
    worstStrategy: strat.worst,
    bestDay: days.best,
    worstDay: days.worst,
    bestTimeSlot: slots.best,
    worstTimeSlot: slots.worst,
    minBucketTrades,
    highConfWinRate,
    highConfTrades,
    overconfidenceBias,
    isOvertrading,
    tiltRisk,
    emotionalTrend,
    traderLevel: inferTraderLevel({ totalPnl: totalPnlRounded, winRate, sharpeRatio: sharpe }),
    compositeScore: clampScore(scores.reduce((s, v) => s + v, 0) / scores.length),
    riskScore: riskHealthScore({ sharpeRatio: sharpe, maxDrawdown: Math.round(maxDrawdown), totalPnl: totalPnlRounded }),
    monthEndProjection,
    remainingTradingDays,
    forecastConfidence,
    avgTradesPerDay,
    recommendedMaxTrades,
    recommendedMinConfidence,
    sampleSize: n < 20 ? "small" : n < 100 ? "moderate" : "large",
  }

  return {
    totalTrades: n,
    totalPnl: Math.round(totalPnl),
    winRate,
    winCount,
    lossCount,
    avgPnl,
    biggestWin: biggestWin === -Infinity ? 0 : Math.round(biggestWin),
    biggestLoss: biggestLoss === Infinity ? 0 : Math.round(biggestLoss),
    maxDrawdown: Math.round(maxDrawdown),
    sharpeRatio: sharpe,
    currentStreak,
    streakType,
    avgRecoveryTrades,
    recoveryInstances: recoveryData.length,
    equityCurve: downsampleEquity(equityCurve, 60),
    strategies,
    dayOfWeek,
    emotions: toBucket(emotionMap),
    confidenceBuckets,
    overtrading: {
      lowDays: lowDays.length,
      highDays: highDays.length,
      lowDayWR,
      highDayWR,
      lowDayAvgPnl,
      highDayAvgPnl,
    },
    afterLossStreaks: Object.entries(afterLossStreak).map(([streak, d]) => ({
      streak: Number(streak),
      count: d.count,
      winRate: d.count > 0 ? Math.round((d.wins / d.count) * 100) : 0,
    })),
    whatIf: [
      {
        id: "cap-losses",
        label: "Cap losses at avg loss",
        currentPnl: Math.round(totalPnl),
        projectedPnl: whatIfCutLoss,
        difference: whatIfCutLoss - Math.round(totalPnl),
        tradeCount: n,
      },
      {
        id: "high-conf",
        label: "Only confidence ≥ 3",
        currentPnl: Math.round(totalPnl),
        projectedPnl: whatIfHighConf,
        difference: whatIfHighConf - Math.round(totalPnl),
        tradeCount: confAbove3.length,
      },
    ],
    duration: {
      shortCount,
      longCount,
      shortWR: shortCount > 0 ? Math.round((shortWins / shortCount) * 100) : 0,
      longWR: longCount > 0 ? Math.round((longWins / longCount) * 100) : 0,
      timedCount: shortCount + longCount,
    },
    emotionalTrend: {
      avgSatFirst: satFirst,
      avgSatSecond: satSecond,
      avgConfFirst: avg(first10, "entryConfidence"),
      avgConfSecond: avg(second10, "entryConfidence"),
    },
    mistakes: Object.entries(mistakeAgg)
      .map(([mistake, d]) => ({
        mistake,
        count: d.count,
        totalPnl: Math.round(d.totalPnl),
      }))
      .sort((a, b) => a.totalPnl - b.totalPnl)
      .slice(0, 8),
    skillScores,
    thisMonth: {
      trades: thisMonthTrades,
      pnl: Math.round(thisMonthPnl),
      days: thisMonthDays.size,
      dailyAvg: thisMonthDailyAvg,
    },
    lastMonth: {
      trades: lastMonthTrades,
      pnl: Math.round(lastMonthPnl),
    },
    dataRange: {
      from: earliest.toLocaleDateString("en-IN"),
      to: latest.toLocaleDateString("en-IN"),
      fromIso: earliest.toISOString().slice(0, 10),
      toIso: latest.toISOString().slice(0, 10),
      totalDays: uniqueDays,
      totalTrades: n,
    },
    breakevenCount,
    avgWin,
    avgLoss: -avgLossAbsRounded,
    profitFactor,
    payoffRatio,
    expectancy,
    longestWinStreak,
    longestLossStreak,
    timeOfDay,
    symbols,
    signals,
  }
}

function downsampleEquity(points: EquityPoint[], maxPoints: number): EquityPoint[] {
  if (points.length <= maxPoints) return points
  const step = Math.ceil(points.length / maxPoints)
  const sampled: EquityPoint[] = []
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i])
  }
  const last = points[points.length - 1]
  if (sampled[sampled.length - 1] !== last) sampled.push(last)
  return sampled
}

function emptyMetrics(): InsightsMetrics {
  return {
    totalTrades: 0,
    totalPnl: 0,
    winRate: 0,
    winCount: 0,
    lossCount: 0,
    avgPnl: 0,
    biggestWin: 0,
    biggestLoss: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    currentStreak: 0,
    streakType: "",
    avgRecoveryTrades: 0,
    recoveryInstances: 0,
    equityCurve: [],
    strategies: [],
    dayOfWeek: [],
    emotions: [],
    confidenceBuckets: [],
    overtrading: {
      lowDays: 0,
      highDays: 0,
      lowDayWR: 0,
      highDayWR: 0,
      lowDayAvgPnl: 0,
      highDayAvgPnl: 0,
    },
    afterLossStreaks: [],
    whatIf: [],
    duration: { shortCount: 0, longCount: 0, shortWR: 0, longWR: 0, timedCount: 0 },
    emotionalTrend: { avgSatFirst: 0, avgSatSecond: 0, avgConfFirst: 0, avgConfSecond: 0 },
    mistakes: [],
    skillScores: { risk: 0, psychology: 0, consistency: 0, edge: 0, discipline: 0 },
    thisMonth: { trades: 0, pnl: 0, days: 0, dailyAvg: 0 },
    lastMonth: { trades: 0, pnl: 0 },
    dataRange: { from: "", to: "", fromIso: "", toIso: "", totalDays: 0, totalTrades: 0 },
  }
}
