import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { MIN_TRADES_FOR_INSIGHTS, computeMetrics, fetchInsightTrades } from "@/lib/ai/insights"
import { buildPlannerContext, generatePlan, type PlannerApiResponse } from "@/lib/ai/planner"

export const maxDuration = 60

export async function GET() {
  try {
    const apiKey = (process.env.GROQ_API_KEY || "").trim()
    if (!apiKey) {
      return NextResponse.json({ error: "AI service is not configured" }, { status: 500 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { trades, error } = await fetchInsightTrades(supabase, user.id)
    if (error) {
      console.error("AI planner trades fetch error:", error)
      return NextResponse.json({ error: "Failed to load trades" }, { status: 500 })
    }

    if (trades.length < MIN_TRADES_FOR_INSIGHTS) {
      return NextResponse.json({
        ready: false,
        summary: `Add at least ${MIN_TRADES_FOR_INSIGHTS} trades to unlock the AI Daily Planner.`,
      } satisfies PlannerApiResponse)
    }

    const metrics = computeMetrics(trades)
    const ctx = buildPlannerContext(metrics, trades)
    const { plan, validation } = await generatePlan(ctx, trades, apiKey)

    return NextResponse.json({ ready: true, ...plan, validation } satisfies PlannerApiResponse)
  } catch (error) {
    console.error("AI Planner error:", error)
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 })
  }
}
