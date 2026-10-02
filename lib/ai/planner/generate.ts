import { chatJson } from "../groq-json"
import { GROQ_MODEL } from "../insights/types"
import type { InsightTrade } from "../insights/types"
import type { GuardrailReport } from "../guardrail/types"
import type { PlannerContext } from "./context"
import { fallbackPlan } from "./fallback"
import { buildPlannerPrompt, PLANNER_SYSTEM_PROMPT } from "./prompt"
import { planSchema, type DailyPlan } from "./types"
import { validatePlan } from "./validate"

export async function generatePlan(
  ctx: PlannerContext,
  recent: InsightTrade[],
  apiKey: string
): Promise<{ plan: DailyPlan; validation: GuardrailReport }> {
  const fallback = fallbackPlan(ctx)
  let raw: DailyPlan | null = null
  try {
    const res = await chatJson({
      apiKey,
      model: GROQ_MODEL,
      timeoutMs: 40_000,
      temperature: 0.3,
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        { role: "user", content: buildPlannerPrompt(ctx, recent) },
      ],
    })
    if (res.json && typeof res.json === "object") {
      const parsed = planSchema.safeParse({ ...fallback, ...(res.json as object) })
      if (parsed.success) raw = parsed.data
    }
  } catch (err) {
    console.error("Groq planner generation failed:", err)
  }

  const { plan, auditor } = validatePlan(raw ?? fallback, ctx, fallback)
  return { plan, validation: auditor.report({ attempts: 1, usedFallback: raw === null }) }
}
