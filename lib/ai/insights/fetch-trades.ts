import { createHash } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  ANALYSIS_WINDOW_DAYS,
  TRADE_HARD_CAP,
  type InsightTrade,
} from "./types"

function windowStartDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - ANALYSIS_WINDOW_DAYS)
  return d.toISOString().slice(0, 10)
}

export async function fetchInsightTrades(
  supabase: SupabaseClient,
  userId: string
): Promise<{ trades: InsightTrade[]; error: string | null }> {
  const fromDate = windowStartDate()

  const { data: rawTrades, error } = await supabase
    .from("trades")
    .select(`
      id,
      trade_date,
      trade_type,
      symbol,
      strategy,
      pnl,
      pnl_percent,
      entry_time,
      exit_time,
      entry_confidence,
      satisfaction,
      emotional_state,
      quantity,
      created_at,
      trade_mistakes(mistake)
    `)
    .eq("user_id", userId)
    .gte("trade_date", fromDate)
    .order("trade_date", { ascending: false })
    .limit(TRADE_HARD_CAP)

  if (error) {
    return { trades: [], error: error.message }
  }

  const trades: InsightTrade[] = (rawTrades || []).map((t) => ({
    id: t.id,
    date: t.trade_date,
    type: t.trade_type,
    symbol: t.symbol,
    strategy: t.strategy || "Unknown",
    pnl: Number(t.pnl),
    pnlPercent: Number(t.pnl_percent),
    entryTime: t.entry_time,
    exitTime: t.exit_time,
    entryConfidence: Number(t.entry_confidence || 3),
    satisfaction: Number(t.satisfaction || 3),
    emotionalState: t.emotional_state,
    quantity: Number(t.quantity || 0),
    mistakes: Array.isArray(t.trade_mistakes)
      ? t.trade_mistakes.map((m: { mistake: string }) => m.mistake)
      : [],
    createdAt: t.created_at,
  }))

  return { trades, error: null }
}

/** Lightweight hash for stale detection — ids + created_at of windowed trades. */
export function computeTradesHash(trades: InsightTrade[]): string {
  const material = trades
    .map((t) => `${t.id}:${t.createdAt ?? ""}:${t.pnl}`)
    .sort()
    .join("|")
  return createHash("sha256").update(material || "empty").digest("hex").slice(0, 32)
}

/** Fast hash check without loading full projected rows for GET stale flag. */
export async function fetchTradesHash(
  supabase: SupabaseClient,
  userId: string
): Promise<{ hash: string; count: number; error: string | null }> {
  const fromDate = windowStartDate()

  const { data, error } = await supabase
    .from("trades")
    .select("id, created_at, pnl")
    .eq("user_id", userId)
    .gte("trade_date", fromDate)
    .order("trade_date", { ascending: false })
    .limit(TRADE_HARD_CAP)

  if (error) {
    return { hash: "", count: 0, error: error.message }
  }

  const rows = data || []
  const material = rows
    .map((t) => `${t.id}:${t.created_at ?? ""}:${Number(t.pnl)}`)
    .sort()
    .join("|")
  const hash = createHash("sha256").update(material || "empty").digest("hex").slice(0, 32)
  return { hash, count: rows.length, error: null }
}
