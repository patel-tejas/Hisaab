/**
 * Revenge-trade detection and the discipline score.
 *
 * Both are deterministic and computed in code, so the AI layer can cite them
 * and the guardrail can check every number it quotes.
 *
 * The score blends four habits that are all visible in the journal today:
 *
 *   stop loss used      30%   share of trades with a stop loss set
 *   revenge-free        30%   share of timed trades NOT entered within 30 min of a loss
 *   mistake-free        25%   share of trades with no mistake tagged
 *   daily trade cap     15%   share of trading days with at most 3 trades
 *
 * A component that cannot be measured (no entry times, say) is dropped and the
 * remaining weights are rescaled, rather than counted as zero or as perfect.
 */

export const DISCIPLINE_MIN_TRADES = 5
export const REVENGE_WINDOW_MINUTES = 30
/** Matches the "1-3 trades vs 4+ trades" split the insights engine already uses. */
export const MAX_TRADES_PER_DAY = 3

export const DISCIPLINE_WEIGHTS = {
  stopLoss: 30,
  revengeFree: 30,
  mistakeFree: 25,
  pace: 15,
} as const

export interface SequenceTrade {
  /** YYYY-MM-DD (a longer ISO string is accepted; only the date part is used). */
  date: string
  /** "HH:MM", "HH:MM:SS", or either with an AM/PM suffix. */
  entryTime?: string | null
  pnl: number
}

export interface DisciplineInput extends SequenceTrade {
  stopLoss?: number | null
  mistakes?: readonly string[] | null
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/
const TIME_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/

/** Minutes since the epoch for a trade's entry, or null when date or time can't be read. */
export function entryMinute(t: Pick<SequenceTrade, "date" | "entryTime">): number | null {
  const d = DATE_RE.exec(t.date ?? "")
  const tm = TIME_RE.exec((t.entryTime ?? "").trim())
  if (!d || !tm) return null

  let hour = Number(tm[1])
  const minute = Number(tm[2])
  const meridiem = tm[3]?.toLowerCase()
  if (meridiem === "pm" && hour < 12) hour += 12
  if (meridiem === "am" && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null

  const dayMs = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]))
  return dayMs / 60000 + hour * 60 + minute
}

export type RevengeSeverity = "high" | "medium" | "low"

export interface RevengeHit<T extends SequenceTrade> {
  trade: T
  afterLoss: T
  gapMinutes: number
  severity: RevengeSeverity
}

/**
 * A trade is flagged when it is entered within `windowMinutes` of the previous
 * trade's entry and that previous trade lost. Trades without a readable entry
 * time can't be placed in the sequence and are ignored.
 */
export function detectRevengeTrades<T extends SequenceTrade>(
  trades: readonly T[],
  windowMinutes = REVENGE_WINDOW_MINUTES
): RevengeHit<T>[] {
  const timed: { t: T; at: number }[] = []
  for (const t of trades) {
    const at = entryMinute(t)
    if (at !== null) timed.push({ t, at })
  }
  timed.sort((a, b) => a.at - b.at)

  const hits: RevengeHit<T>[] = []
  for (let i = 1; i < timed.length; i++) {
    const prev = timed[i - 1]
    const curr = timed[i]
    if (prev.t.pnl >= 0) continue
    const gap = curr.at - prev.at
    if (gap < 0 || gap > windowMinutes) continue
    hits.push({
      trade: curr.t,
      afterLoss: prev.t,
      gapMinutes: Math.round(gap),
      severity: gap <= 5 ? "high" : gap <= 15 ? "medium" : "low",
    })
  }
  return hits
}

export type DisciplineKey = keyof typeof DISCIPLINE_WEIGHTS
export type DisciplineBand = "Strong" | "Steady" | "Slipping" | "Needs work"

export interface DisciplineComponent {
  key: DisciplineKey
  label: string
  /** 0..100, or null when this habit could not be measured from the journal. */
  value: number | null
  weight: number
  /** Plain-language evidence, e.g. "62 of 80 trades had a stop loss". */
  detail: string
}

export interface DisciplineScore {
  /** False until the journal has DISCIPLINE_MIN_TRADES trades. */
  ready: boolean
  /** 0..100, or null when not ready. */
  score: number | null
  band: DisciplineBand | null
  components: DisciplineComponent[]
  tradeCount: number
  revengeCount: number
}

const pct = (num: number, den: number) => Math.round((num / den) * 100)

export function disciplineBand(score: number): DisciplineBand {
  if (score >= 80) return "Strong"
  if (score >= 60) return "Steady"
  if (score >= 40) return "Slipping"
  return "Needs work"
}

export function disciplineScore(trades: readonly DisciplineInput[]): DisciplineScore {
  const n = trades.length
  const revenge = detectRevengeTrades(trades)

  // Stop loss
  const withStop = trades.filter((t) => t.stopLoss != null && Number.isFinite(t.stopLoss) && t.stopLoss > 0).length

  // Revenge: only trades with a readable entry time can be judged either way.
  const timed = trades.filter((t) => entryMinute(t) !== null).length

  // Mistakes
  const clean = trades.filter((t) => !(t.mistakes ?? []).some((m) => m.trim() !== "" && m.trim().toLowerCase() !== "no mistakes")).length

  // Pace
  const perDay = new Map<string, number>()
  for (const t of trades) {
    const day = t.date.slice(0, 10)
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  const days = perDay.size
  const calmDays = [...perDay.values()].filter((c) => c <= MAX_TRADES_PER_DAY).length

  const revengeMeasurable = timed >= DISCIPLINE_MIN_TRADES

  const components: DisciplineComponent[] = [
    {
      key: "stopLoss",
      label: "Stop loss used",
      value: n > 0 ? pct(withStop, n) : null,
      weight: DISCIPLINE_WEIGHTS.stopLoss,
      detail: `${withStop} of ${n} trades had a stop loss`,
    },
    {
      key: "revengeFree",
      label: "No revenge entries",
      value: revengeMeasurable ? pct(timed - revenge.length, timed) : null,
      weight: DISCIPLINE_WEIGHTS.revengeFree,
      detail: revengeMeasurable
        ? `${revenge.length} of ${timed} timed trades came within ${REVENGE_WINDOW_MINUTES} min of a loss`
        : `Needs ${DISCIPLINE_MIN_TRADES}+ trades with an entry time`,
    },
    {
      key: "mistakeFree",
      label: "Mistake-free trades",
      value: n > 0 ? pct(clean, n) : null,
      weight: DISCIPLINE_WEIGHTS.mistakeFree,
      detail: `${clean} of ${n} trades had no mistake tagged`,
    },
    {
      key: "pace",
      label: `Max ${MAX_TRADES_PER_DAY} trades a day`,
      value: days > 0 ? pct(calmDays, days) : null,
      weight: DISCIPLINE_WEIGHTS.pace,
      detail: `${calmDays} of ${days} trading days stayed within ${MAX_TRADES_PER_DAY} trades`,
    },
  ]

  if (n < DISCIPLINE_MIN_TRADES) {
    return { ready: false, score: null, band: null, components, tradeCount: n, revengeCount: revenge.length }
  }

  let weighted = 0
  let weightSum = 0
  for (const c of components) {
    if (c.value === null) continue
    weighted += c.value * c.weight
    weightSum += c.weight
  }
  const score = weightSum > 0 ? Math.round(weighted / weightSum) : null

  return {
    ready: score !== null,
    score,
    band: score === null ? null : disciplineBand(score),
    components,
    tradeCount: n,
    revengeCount: revenge.length,
  }
}
