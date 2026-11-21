/**
 * Number formatting shared by the journal calculators and exports.
 * Indian digit grouping (12,34,567) throughout.
 */

/** ₹1,23,456 (rounded) or ₹1,234.50 when `digits` is given. Negative values get a leading "-". */
export function inr(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "-"
  const body = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${n < 0 ? "-" : ""}₹${body}`
}

/** +0.62R / -1.00R. */
export function formatR(r: number, digits = 2): string {
  if (!Number.isFinite(r)) return "-"
  const fixed = r.toFixed(digits)
  return `${r > 0 ? "+" : ""}${fixed}R`
}

/** Parses a user-typed number. Accepts commas ("1,50,000"). Returns undefined for blank or invalid input. */
export function parseNum(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, "").trim()
  if (cleaned === "") return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}
