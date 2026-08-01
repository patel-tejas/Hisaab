import type {
  BucketStat,
  ConfidenceBucket,
  EquityPoint,
  InsightTrade,
  InsightsMetrics,
  SkillScores,
} from "./types"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function toBucket(map: Record<string, { pnl: number; count: number; wins: number }>): BucketStat[] {
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

export function computeMetrics(trades: InsightTrade[]): InsightsMetrics {
  if (trades.length === 0) {
    return emptyMetrics()
  }

  const chronological = [...trades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id)
  )

  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`

  let totalPnl = 0
  let winCount = 0
  let lossCount = 0
  let biggestWin = -Infinity
  let biggestLoss = Infinity
  let sumSq = 0

  const stratMap: Record<string, { pnl: number; count: number; wins: number }> = {}
  const dayMap: Record<string, { pnl: number; count: number; wins: number }> = {}
  const emotionMap: Record<string, { pnl: number; count: number; wins: number }> = {}
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

  // Duration
  let shortWins = 0, shortCount = 0, longWins = 0, longCount = 0

  // Month
  let thisMonthTrades = 0, thisMonthPnl = 0
  const thisMonthDays = new Set<string>()
  let lastMonthTrades = 0, lastMonthPnl = 0

  for (const t of chronological) {
    const pnl = t.pnl
    totalPnl += pnl
    if (pnl > 0) winCount++
    else lossCount++
    if (pnl > biggestWin) biggestWin = pnl
    if (pnl < biggestLoss) biggestLoss = pnl
    if (pnl < 0) losses.push(pnl)

    // Strategy / day / emotion / confidence
    const strat = t.strategy || "Unknown"
    if (!stratMap[strat]) stratMap[strat] = { pnl: 0, count: 0, wins: 0 }
    stratMap[strat].pnl += pnl
    stratMap[strat].count++
    if (pnl > 0) stratMap[strat].wins++

    const day = DAY_NAMES[new Date(t.date).getDay()]
    if (!dayMap[day]) dayMap[day] = { pnl: 0, count: 0, wins: 0 }
    dayMap[day].pnl += pnl
    dayMap[day].count++
    if (pnl > 0) dayMap[day].wins++

    const emotion = t.emotionalState || "Unknown"
    if (!emotionMap[emotion]) emotionMap[emotion] = { pnl: 0, count: 0, wins: 0 }
    emotionMap[emotion].pnl += pnl
    emotionMap[emotion].count++
    if (pnl > 0) emotionMap[emotion].wins++

    const conf = t.entryConfidence || 3
    if (!confMap[conf]) confMap[conf] = { count: 0, wins: 0, pnl: 0 }
    confMap[conf].count++
    confMap[conf].pnl += pnl
    if (pnl > 0) confMap[conf].wins++

    const dayKey = new Date(t.date).toDateString()
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
    if (pnl <= 0) lossStreak++
    else lossStreak = 0

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
    const d = new Date(t.date)
    const mk = `${d.getFullYear()}-${d.getMonth()}`
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
  const newestFirst = [...trades].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
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

  const tradeDates = chronological.map((t) => new Date(t.date).getTime())
  const earliest = new Date(Math.min(...tradeDates))
  const latest = new Date(Math.max(...tradeDates))
  const uniqueDays = new Set(chronological.map((t) => new Date(t.date).toDateString())).size

  const avgRecoveryTrades =
    recoveryData.length > 0
      ? Math.round((recoveryData.reduce((s, v) => s + v, 0) / recoveryData.length) * 10) / 10
      : 0

  const thisMonthDailyAvg =
    thisMonthDays.size > 0 ? Math.round(thisMonthPnl / thisMonthDays.size) : 0

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
    strategies: toBucket(stratMap),
    dayOfWeek: toBucket(dayMap),
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
      avgSatFirst: avg(first10, "satisfaction"),
      avgSatSecond: avg(second10, "satisfaction"),
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
