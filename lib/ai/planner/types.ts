import { z } from "zod"
import type { GuardrailReport } from "../guardrail/types"

export const planSchema = z.object({
  greeting: z.string().default(""),
  focusStrategy: z
    .object({
      name: z.string().default(""),
      reason: z.string().default(""),
      winRate: z.coerce.string().default(""),
      avgPnl: z.coerce.number().catch(0).default(0),
    })
    .optional(),
  avoidStrategy: z.object({ name: z.string().default(""), reason: z.string().default("") }).optional(),
  tradeLimit: z.object({ max: z.coerce.number().catch(0).default(0), reason: z.string().default("") }).optional(),
  confidenceThreshold: z
    .object({ min: z.coerce.number().catch(0).default(0), reason: z.string().default("") })
    .optional(),
  bestTimeWindows: z
    .array(z.object({ time: z.string().default(""), reason: z.string().default("") }))
    .default([])
    .transform((a) => a.slice(0, 3)),
  emotionalAdvice: z.object({ watchFor: z.string().default(""), tip: z.string().default("") }).optional(),
  keyRules: z.array(z.string()).default([]).transform((a) => a.slice(0, 5)),
  streakAdvice: z.string().default(""),
  marketFocus: z.string().default(""),
})

export type DailyPlan = z.infer<typeof planSchema>

export interface PlannerApiResponse extends Partial<DailyPlan> {
  ready: boolean
  summary?: string
  validation?: GuardrailReport
}
