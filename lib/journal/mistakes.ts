/**
 * What each tagged mistake has cost in rupees.
 *
 * `totalPnl` is the net P&L of every trade carrying the tag. A trade with two
 * tags counts toward both, so rows can overlap and should not be summed. The
 * "No Mistakes" placeholder tag is not a mistake and is excluded.
 */

export interface MistakeTagged {
  pnl: number
  mistakes?: readonly string[] | null
}

export interface MistakeCost {
  mistake: string
  count: number
  totalPnl: number
  avgPnl: number
}

const NOT_A_MISTAKE = "no mistakes"

export function isRealMistake(tag: string): boolean {
  const t = tag.trim().toLowerCase()
  return t !== "" && t !== NOT_A_MISTAKE
}

/** Most costly first (most negative total P&L); ties broken by frequency. */
export function mistakeCosts(trades: readonly MistakeTagged[]): MistakeCost[] {
  const acc = new Map<string, { count: number; totalPnl: number }>()

  for (const t of trades) {
    if (!t.mistakes?.length) continue
    // A tag repeated on one trade is still one occurrence.
    for (const tag of new Set(t.mistakes.map((m) => m.trim()))) {
      if (!isRealMistake(tag)) continue
      const row = acc.get(tag) ?? { count: 0, totalPnl: 0 }
      row.count++
      row.totalPnl += t.pnl
      acc.set(tag, row)
    }
  }

  return [...acc.entries()]
    .map(([mistake, r]) => ({
      mistake,
      count: r.count,
      totalPnl: r.totalPnl,
      avgPnl: r.totalPnl / r.count,
    }))
    .sort((a, b) => a.totalPnl - b.totalPnl || b.count - a.count)
}
