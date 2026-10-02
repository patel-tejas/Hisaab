import type { NumericClaim } from "./types"

/**
 * Extract the numeric claims an LLM makes in free text.
 *
 * Recognised forms (Indian notation included):
 *   money    Rs12,345 · Rs. 1,23,456 · ₹4.5k · -Rs800 · Rs -800 · INR 2L · Rs1.2 lakh
 *   percent  62% · 62 % · 62 percent · 8pp · 8 percentage points
 *   count    14 trades · 3 consecutive losses · 4+ trades · 22 trading days
 *   decimal  Sharpe 0.42 · 1.8x payoff · recovers in 2.5 trades
 *
 * Dates, clock times and n/5 ratings are stripped first so they are not read
 * as claims. Each pass masks what it matched so a number is only claimed once.
 */

const NUM = String.raw`\d+(?:,\d+)*(?:\.\d+)?`

const MONEY_RE = new RegExp(
  String.raw`(-\s*)?(?:Rs\.?|INR|₹)\s*(-\s*)?(${NUM})\s*(k|K|L|lakhs?|lacs?|Cr|cr|crores?)?(?![A-Za-z0-9])`,
  "g"
)
const PERCENT_RE = new RegExp(
  String.raw`(?<![\d.,])([-+])?(${NUM})\s*(%|percent(?:age points?)?\b|pp\b|ppts?\b)`,
  "g"
)
const COUNT_RE = new RegExp(
  String.raw`(?<![\d.,])(\d+(?:,\d+)*)\+?\s+(?:(?:consecutive|straight|winning|losing|trading|green|red|total|big|large|more|fewer|separate)\s+)?(trades?|days?|wins?|losses|loss|times|instances|sessions|setups|mistakes|occasions)\b`,
  "gi"
)
const DECIMAL_RE = /(?<![\d.,])(-)?(\d+\.\d+)(?![\d.,%])/g

const STRIP_PATTERNS: RegExp[] = [
  /\b\d{4}-\d{2}-\d{2}\b/g, // 2026-09-01
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // 01/09/2026
  /\b\d{1,2}:\d{2}(?::\d{2})?\b/g, // 09:15
  /\b\d(?:\.\d+)?\s*\/\s*5\b/g, // 4/5 confidence, 3.2/5 satisfaction
]

function mask(text: string, start: number, length: number): string {
  return text.slice(0, start) + " ".repeat(length) + text.slice(start + length)
}

function parseNum(s: string): { value: number; decimals: number } {
  const clean = s.replace(/,/g, "")
  const dot = clean.indexOf(".")
  return { value: Number(clean), decimals: dot === -1 ? 0 : clean.length - dot - 1 }
}

function suffixMultiplier(suffix: string | undefined): number {
  if (!suffix) return 1
  const s = suffix.toLowerCase()
  if (s === "k") return 1_000
  if (s === "l" || s.startsWith("lakh") || s.startsWith("lac")) return 100_000
  if (s === "cr" || s.startsWith("crore")) return 10_000_000
  return 1
}

export function normalizeText(text: string): string {
  // Unicode minus/dashes → ASCII hyphen so signs parse consistently.
  return text.replace(/[−‒–—]/g, "-")
}

export function extractClaims(input: string): NumericClaim[] {
  const claims: NumericClaim[] = []
  let text = normalizeText(input)

  for (const re of STRIP_PATTERNS) {
    text = text.replace(re, (m) => " ".repeat(m.length))
  }

  const run = (re: RegExp, build: (m: RegExpExecArray) => NumericClaim | null) => {
    re.lastIndex = 0
    const found: { start: number; length: number }[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const claim = build(m)
      if (claim) claims.push(claim)
      found.push({ start: m.index, length: m[0].length })
    }
    for (const f of found) text = mask(text, f.start, f.length)
  }

  run(MONEY_RE, (m) => {
    const { value, decimals } = parseNum(m[3])
    const mult = suffixMultiplier(m[4])
    if (!Number.isFinite(value)) return null
    return {
      kind: "money",
      value: value * mult,
      negative: Boolean(m[1] || m[2]),
      precision: (mult * Math.pow(10, -decimals)) / 2,
      raw: m[0].trim(),
      index: m.index,
    }
  })

  run(PERCENT_RE, (m) => {
    const { value, decimals } = parseNum(m[2])
    if (!Number.isFinite(value)) return null
    return {
      kind: "percent",
      value,
      negative: m[1] === "-",
      precision: Math.pow(10, -decimals) / 2,
      raw: m[0].trim(),
      index: m.index,
    }
  })

  run(COUNT_RE, (m) => {
    const { value } = parseNum(m[1])
    if (!Number.isFinite(value)) return null
    return {
      kind: "count",
      value,
      negative: false,
      precision: 0,
      raw: m[0].trim(),
      index: m.index,
    }
  })

  run(DECIMAL_RE, (m) => {
    const { value, decimals } = parseNum(m[2])
    if (!Number.isFinite(value)) return null
    return {
      kind: "decimal",
      value,
      negative: m[1] === "-",
      precision: Math.pow(10, -decimals) / 2,
      raw: m[0].trim(),
      index: m.index,
    }
  })

  return claims.sort((a, b) => a.index - b.index)
}

/**
 * Split text into sentences without breaking on decimals ("0.42"),
 * "Rs." or common abbreviations.
 */
export function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<!\bRs\.)(?<!\bvs\.)(?<!\be\.g\.)(?<!\bi\.e\.)(?<!\bapprox\.)(?<=[.!?])\s+(?=\S)/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [text.trim()].filter(Boolean)
}
