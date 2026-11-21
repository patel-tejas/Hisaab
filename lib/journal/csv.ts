/**
 * CSV export of the trade journal.
 *
 * Two things this is careful about:
 *  - Spreadsheet formula injection. Free-text cells (symbol, notes...) that start
 *    with = + - @ or a tab/CR are prefixed with an apostrophe so Excel and Sheets
 *    read them as text. Numeric cells are written raw, so negative P&L stays a number.
 *  - Notes are stored as rich-text HTML; they are exported as plain text.
 */

import { tradeR } from "./r-multiple"

export interface ExportTrade {
  date: string
  symbol: string
  type?: string | null
  quantity: number
  entryPrice: number
  exitPrice: number
  entryTime?: string | null
  exitTime?: string | null
  stopLoss?: number | null
  target?: number | null
  pnl: number
  pnlPercent?: number | null
  brokerage?: number | null
  strategy?: string | null
  outcome?: string | null
  emotionalState?: string | null
  entryConfidence?: number | null
  satisfaction?: number | null
  mistakes?: readonly string[] | null
  notes?: string | null
  lessonsLearned?: string | null
  source?: string | null
  brokerOrderId?: string | null
}

const FORMULA_START = /^[=+\-@\t\r]/

/** A free-text cell: neutralise formula starts, then quote if needed. */
export function csvText(value: string | null | undefined): string {
  let s = (value ?? "").toString()
  if (FORMULA_START.test(s)) s = `'${s}`
  return quote(s)
}

/** A numeric cell: raw digits, blank when missing. */
export function csvNumber(value: number | null | undefined, digits?: number): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ""
  return digits === undefined ? String(value) : value.toFixed(digits)
}

function quote(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
}

/** Rich-text HTML to readable plain text. Block ends become newlines. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const HEADERS = [
  "Date",
  "Symbol",
  "Direction",
  "Quantity",
  "Entry price",
  "Exit price",
  "Entry time",
  "Exit time",
  "Stop loss",
  "Target",
  "P&L",
  "P&L %",
  "Charges",
  "Net P&L",
  "R multiple",
  "Strategy",
  "Outcome",
  "Emotional state",
  "Entry confidence",
  "Satisfaction",
  "Mistakes",
  "Notes",
  "Lessons learned",
  "Source",
  "Broker order ID",
] as const

export const CSV_HEADERS: readonly string[] = HEADERS

export function tradeToRow(t: ExportTrade): string {
  const charges = t.brokerage ?? 0
  const r = tradeR({ type: t.type, entryPrice: t.entryPrice, exitPrice: t.exitPrice, stopLoss: t.stopLoss })
  return [
    csvText(t.date?.slice(0, 10)),
    csvText(t.symbol),
    csvText(t.type),
    csvNumber(t.quantity),
    csvNumber(t.entryPrice),
    csvNumber(t.exitPrice),
    csvText(t.entryTime),
    csvText(t.exitTime),
    csvNumber(t.stopLoss),
    csvNumber(t.target),
    csvNumber(t.pnl),
    csvNumber(t.pnlPercent, 2),
    csvNumber(charges),
    csvNumber(t.pnl - charges),
    csvNumber(r, 2),
    csvText(t.strategy),
    csvText(t.outcome),
    csvText(t.emotionalState),
    csvNumber(t.entryConfidence),
    csvNumber(t.satisfaction),
    csvText((t.mistakes ?? []).join("; ")),
    csvText(htmlToText(t.notes)),
    csvText(htmlToText(t.lessonsLearned)),
    csvText(t.source),
    csvText(t.brokerOrderId),
  ].join(",")
}

/** Header row plus one row per trade, CRLF-separated (what Excel expects). */
export function tradesToCsv(trades: readonly ExportTrade[]): string {
  return [HEADERS.join(","), ...trades.map(tradeToRow)].join("\r\n") + "\r\n"
}
