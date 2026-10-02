import { chatJson, type ChatMessage } from "../groq-json"
import { feedbackFromIssues } from "../guardrail/auditor"
import type { GuardrailReport } from "../guardrail/types"
import { fallbackFromMetrics } from "./fallback"
import { buildGenerationPrompt, buildRepairPrompt, INSIGHTS_SYSTEM_PROMPT } from "./prompt"
import {
  GENERATION_BUDGET_MS,
  GROQ_MODEL,
  GROQ_TIMEOUT_MS,
  REPAIR_ERROR_THRESHOLD,
  insightsPayloadSchema,
  type InsightTrade,
  type InsightsMetrics,
  type InsightsPayload,
} from "./types"
import { validateInsights } from "./validate"

export { fallbackFromMetrics }

/** Parse whatever the model returned, filling missing sections from the fallback. */
function parsePayload(json: unknown, fallback: InsightsPayload): InsightsPayload | null {
  if (!json || typeof json !== "object") return null
  const direct = insightsPayloadSchema.safeParse(json)
  if (direct.success) return direct.data
  const merged = insightsPayloadSchema.safeParse({ ...fallback, ...(json as object) })
  return merged.success ? merged.data : null
}

/**
 * Generate insights with the guardrail in the loop:
 *   1. ask the model, grounded on computed metrics and verdicts
 *   2. validate every claim against the data
 *   3. if it got several things wrong and there is time, send the errors back
 *      for one repair round and keep whichever answer is more accurate
 *   4. repair what is still wrong deterministically and attach the report
 */
export async function generateInsights(
  metrics: InsightsMetrics,
  recentTrades: InsightTrade[],
  apiKey: string
): Promise<{ payload: InsightsPayload; model: string; usedFallback: boolean; validation: GuardrailReport }> {
  const started = Date.now()
  const fallback = fallbackFromMetrics(metrics)

  const finish = (raw: InsightsPayload, attempts: number, usedFallback: boolean) => {
    const { payload, auditor } = validateInsights(raw, metrics, fallback, recentTrades)
    const validation = auditor.report({ attempts, usedFallback })
    return { payload: { ...payload, validation }, model: GROQ_MODEL, usedFallback, validation }
  }

  const messages: ChatMessage[] = [
    { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
    { role: "user", content: buildGenerationPrompt(metrics, recentTrades) },
  ]

  let first: { raw: InsightsPayload; errors: number; text: string } | null = null
  try {
    const res = await chatJson({ apiKey, model: GROQ_MODEL, messages, timeoutMs: GROQ_TIMEOUT_MS })
    const raw = parsePayload(res.json, fallback)
    if (raw) {
      const { auditor } = validateInsights(raw, metrics, fallback, recentTrades)
      first = { raw, errors: auditor.errorCount(), text: res.text }

      const remaining = GENERATION_BUDGET_MS - (Date.now() - started)
      if (first.errors >= REPAIR_ERROR_THRESHOLD && remaining > 12_000) {
        try {
          const retry = await chatJson({
            apiKey,
            model: GROQ_MODEL,
            messages: [
              ...messages,
              { role: "assistant", content: res.text },
              { role: "user", content: buildRepairPrompt(feedbackFromIssues(auditor.issues)) },
            ],
            timeoutMs: remaining - 2_000,
            temperature: 0.1,
          })
          const repaired = parsePayload(retry.json, fallback)
          if (repaired) {
            const second = validateInsights(repaired, metrics, fallback, recentTrades).auditor.errorCount()
            if (second <= first.errors) return finish(repaired, 2, false)
          }
        } catch (err) {
          console.error("Insights repair round failed:", err)
        }
        return finish(first.raw, 2, false)
      }
      return finish(first.raw, 1, false)
    }
  } catch (err) {
    console.error("Groq insights generation failed:", err)
  }

  return finish(first?.raw ?? fallback, 1, !first)
}
