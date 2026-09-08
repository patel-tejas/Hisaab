import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import {
  MIN_TRADES_FOR_INSIGHTS,
  RATE_LIMIT_MS,
  computeMetrics,
  computeTradesHash,
  fetchInsightTrades,
  fetchTradesHash,
  generateInsights,
  getLatestInsight,
  upsertInsight,
  type AiInsightsApiResponse,
} from "@/lib/ai/insights"

export const maxDuration = 60

function clientError(message: string, status: number, extra?: Record<string, unknown>) {
  const isProd = process.env.NODE_ENV === "production"
  return NextResponse.json(
    {
      error: message,
      ...(isProd ? {} : extra),
    },
    { status }
  )
}

function toResponse(args: {
  ready: boolean
  stale?: boolean
  generatedAt?: string
  metrics?: AiInsightsApiResponse["metrics"]
  insights?: AiInsightsApiResponse["insights"]
  summary?: string
  rateLimited?: boolean
  retryAfterMs?: number
}): AiInsightsApiResponse {
  return {
    ready: args.ready,
    stale: args.stale,
    generatedAt: args.generatedAt,
    metrics: args.metrics,
    insights: args.insights,
    dataRange: args.metrics?.dataRange,
    summary: args.summary,
    rateLimited: args.rateLimited,
    retryAfterMs: args.retryAfterMs,
  }
}

/** GET — return persisted insights; never calls Groq. */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return clientError("Unauthorized", 401)
    }

    const { row, error } = await getLatestInsight(supabase, user.id)
    if (error) {
      console.error("AI insights read error:", error)
      return clientError("Failed to load AI insights", 500)
    }

    const { hash: currentHash, count, error: hashError } = await fetchTradesHash(
      supabase,
      user.id
    )
    if (hashError) {
      console.error("AI insights hash error:", hashError)
      return clientError("Failed to load trade data", 500)
    }

    if (count < MIN_TRADES_FOR_INSIGHTS) {
      return NextResponse.json(
        toResponse({
          ready: false,
          summary: `Add at least ${MIN_TRADES_FOR_INSIGHTS} trades to unlock AI insights.`,
        })
      )
    }

    if (!row) {
      return NextResponse.json(
        toResponse({
          ready: false,
          summary: "Generate your first AI analysis to unlock the coach.",
        })
      )
    }

    const stale = row.trades_hash !== currentHash

    return NextResponse.json(
      toResponse({
        ready: true,
        stale,
        generatedAt: row.updated_at,
        metrics: row.metrics,
        insights: row.payload,
      })
    )
  } catch (error) {
    console.error("AI Insights GET error:", error)
    return clientError("Failed to load AI insights", 500)
  }
}

/** POST — regenerate insights (rate-limited), persist, return. */
export async function POST(req: Request) {
  try {
    const apiKey = (process.env.GROQ_API_KEY || "").trim()
    if (!apiKey) {
      return clientError("AI service is not configured", 500)
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return clientError("Unauthorized", 401)
    }

    const url = new URL(req.url)
    const force = url.searchParams.get("force") === "1" && process.env.NODE_ENV !== "production"

    const { row: existing } = await getLatestInsight(supabase, user.id)
    if (existing && !force) {
      const elapsed = Date.now() - new Date(existing.updated_at).getTime()
      if (elapsed < RATE_LIMIT_MS) {
        return NextResponse.json(
          toResponse({
            ready: true,
            stale: false,
            generatedAt: existing.updated_at,
            metrics: existing.metrics,
            insights: existing.payload,
            rateLimited: true,
            retryAfterMs: RATE_LIMIT_MS - elapsed,
            summary: "Analysis was generated recently. Showing saved results.",
          }),
          { status: 200 }
        )
      }
    }

    const { trades, error: tradesError } = await fetchInsightTrades(supabase, user.id)
    if (tradesError) {
      console.error("AI insights trades fetch error:", tradesError)
      return clientError("Failed to load trades", 500)
    }

    if (trades.length < MIN_TRADES_FOR_INSIGHTS) {
      return NextResponse.json(
        toResponse({
          ready: false,
          summary: `Add at least ${MIN_TRADES_FOR_INSIGHTS} trades to unlock AI insights.`,
        })
      )
    }

    const metrics = computeMetrics(trades)
    const tradesHash = computeTradesHash(trades)
    const { payload, model } = await generateInsights(metrics, trades, apiKey)

    const { error: upsertError, updatedAt } = await upsertInsight(supabase, {
      userId: user.id,
      payload,
      metrics,
      model,
      tradesHash,
    })

    if (upsertError) {
      console.error("AI insights upsert error:", upsertError)
      // Still return generated payload even if persist fails
      return NextResponse.json(
        toResponse({
          ready: true,
          stale: false,
          generatedAt: new Date().toISOString(),
          metrics,
          insights: payload,
        })
      )
    }

    return NextResponse.json(
      toResponse({
        ready: true,
        stale: false,
        generatedAt: updatedAt ?? new Date().toISOString(),
        metrics,
        insights: payload,
      })
    )
  } catch (error) {
    console.error("AI Insights POST error:", error)
    return clientError("Failed to generate AI insights", 500)
  }
}
