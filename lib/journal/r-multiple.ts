/**
 * R-multiples: how many "risks" a trade made or lost.
 *
 *   R = (exit - entry) / (entry - stop)        for a long
 *   R = (entry - exit) / (stop - entry)        for a short
 *
 * It is computed from prices, not from the stored P&L, so it does not depend
 * on lot size, quantity conventions or brokerage.
 *
 * A trade has no R when it has no stop loss, or when the stop sits on the wrong
 * side of entry (a trailed stop in profit): the initial risk cannot be
 * recovered from that, and guessing it would quietly distort the average.
 * Those trades are counted in `skipped` so the UI can say so.
 */

export interface RInput {
  /** "long" | "short" (case-insensitive). `direction` is accepted for older shapes ("BUY" / "SELL"). */
  type?: string | null
  direction?: string | null
  entryPrice: number
  exitPrice: number
  stopLoss?: number | null
}

export function isShortTrade(t: Pick<RInput, "type" | "direction">): boolean {
  const side = (t.type || t.direction || "").toString().toLowerCase()
  return side === "short" || side === "sell"
}

export function tradeR(t: RInput): number | null {
  const { entryPrice: entry, exitPrice: exit, stopLoss: stop } = t
  if (![entry, exit].every((n) => Number.isFinite(n))) return null
  if (stop === null || stop === undefined || !Number.isFinite(stop) || stop <= 0) return null

  const short = isShortTrade(t)
  const risk = short ? stop - entry : entry - stop
  if (!(risk > 0)) return null

  const move = short ? entry - exit : exit - entry
  return move / risk
}

export interface RSummary {
  /** Trades that produced an R value. */
  measured: number
  /** Trades without a usable stop loss. */
  skipped: number
  /** Mean R across measured trades. This is also the expectancy per trade, in R. */
  avgR: number
  totalR: number
  /** Mean R of measured winners / losers (R > 0 / R < 0). 0 when there are none. */
  avgWinR: number
  avgLossR: number
  bestR: number
  worstR: number
}

export function summarizeR(trades: readonly RInput[]): RSummary {
  let measured = 0
  let skipped = 0
  let total = 0
  let winSum = 0
  let winN = 0
  let lossSum = 0
  let lossN = 0
  let best = -Infinity
  let worst = Infinity

  for (const t of trades) {
    const r = tradeR(t)
    if (r === null) {
      skipped++
      continue
    }
    measured++
    total += r
    if (r > 0) {
      winSum += r
      winN++
    } else if (r < 0) {
      lossSum += r
      lossN++
    }
    if (r > best) best = r
    if (r < worst) worst = r
  }

  return {
    measured,
    skipped,
    avgR: measured > 0 ? total / measured : 0,
    totalR: total,
    avgWinR: winN > 0 ? winSum / winN : 0,
    avgLossR: lossN > 0 ? lossSum / lossN : 0,
    bestR: measured > 0 ? best : 0,
    worstR: measured > 0 ? worst : 0,
  }
}
