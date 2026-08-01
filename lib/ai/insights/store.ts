import type { SupabaseClient } from "@supabase/supabase-js"
import type { InsightsMetrics, InsightsPayload } from "./types"

export interface StoredInsightRow {
  id: string
  user_id: string
  payload: InsightsPayload
  metrics: InsightsMetrics
  model: string | null
  trade_count: number
  data_from: string | null
  data_to: string | null
  trades_hash: string
  created_at: string
  updated_at: string
}

export async function getLatestInsight(
  supabase: SupabaseClient,
  userId: string
): Promise<{ row: StoredInsightRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    return { row: null, error: error.message }
  }
  if (!data) {
    return { row: null, error: null }
  }

  return {
    row: {
      id: data.id,
      user_id: data.user_id,
      payload: data.payload as InsightsPayload,
      metrics: data.metrics as InsightsMetrics,
      model: data.model,
      trade_count: data.trade_count,
      data_from: data.data_from,
      data_to: data.data_to,
      trades_hash: data.trades_hash,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
    error: null,
  }
}

export async function upsertInsight(
  supabase: SupabaseClient,
  args: {
    userId: string
    payload: InsightsPayload
    metrics: InsightsMetrics
    model: string
    tradesHash: string
  }
): Promise<{ error: string | null; updatedAt: string | null }> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("ai_insights")
    .upsert(
      {
        user_id: args.userId,
        payload: args.payload,
        metrics: args.metrics,
        model: args.model,
        trade_count: args.metrics.totalTrades,
        data_from: args.metrics.dataRange.fromIso || null,
        data_to: args.metrics.dataRange.toIso || null,
        trades_hash: args.tradesHash,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select("updated_at")
    .single()

  if (error) {
    return { error: error.message, updatedAt: null }
  }
  return { error: null, updatedAt: data?.updated_at ?? now }
}
