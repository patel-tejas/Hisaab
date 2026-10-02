import { buildPromptContext, rs } from "../insights/prompt"
import type { InsightTrade } from "../insights/types"
import type { PlannerContext } from "./context"

export const PLANNER_SYSTEM_PROMPT = `You are Hisaab's trading coach writing a short game plan for today's session.

GROUNDING RULES (your answer is checked by code and anything that breaks these is replaced):
1. Every number you write must appear in the DATA block. Never compute new numbers.
2. Money is written as Rs12,345 or -Rs1,234 with Indian grouping. Win rates are whole percents.
3. focusStrategy and avoidStrategy must be strategy names from the DATA. avoidStrategy must be one with negative total P&L, or "None" if there is none.
4. focusStrategy.winRate and focusStrategy.avgPnl are the strategy's overall numbers from STRATEGY BREAKDOWN.
5. bestTimeWindows must be ENTRY TIME slots from the DATA with positive P&L, written exactly as listed (e.g. 09:00-10:00).
6. tradeLimit.max and confidenceThreshold.min should follow TODAY'S SUGGESTIONS unless the data clearly supports otherwise.
7. Be specific and encouraging but honest. Output one JSON object only.`

export function buildPlannerPrompt(ctx: PlannerContext, recent: InsightTrade[]): string {
  const m = ctx.metrics
  const s = m.signals
  const lines: string[] = []
  lines.push(`=== TODAY: ${ctx.todayName} ===`)
  if (ctx.today) {
    lines.push(`History on ${ctx.todayName}s: ${ctx.today.count} trades, ${ctx.today.winRate}% WR, ${rs(ctx.today.pnl)} total`)
  } else {
    lines.push(`No trades logged on a ${ctx.todayName} yet.`)
  }
  if (ctx.todayStrategies.length) {
    lines.push(`Strategies on ${ctx.todayName}s:`)
    for (const b of ctx.todayStrategies) {
      lines.push(`- ${b.key}: ${b.count} trades, ${b.winRate}% WR, ${rs(b.pnl)} total, ${rs(b.pnl / Math.max(1, b.count))}/trade`)
    }
  }
  lines.push("")
  lines.push("=== TODAY'S SUGGESTIONS (computed) ===")
  lines.push(`- Focus strategy: ${ctx.focusStrategy?.key ?? "n/a"}`)
  lines.push(`- Strategy to avoid: ${ctx.avoidStrategy?.key ?? "None"}`)
  lines.push(`- Trade limit: ${s?.recommendedMaxTrades ?? 3}`)
  lines.push(`- Minimum confidence: ${s?.recommendedMinConfidence ?? 3}/5`)
  lines.push(`- Profitable entry windows: ${ctx.goodWindows.map((w) => w.key).join(", ") || "none yet"}`)

  const shape = JSON.stringify(
    {
      greeting: `One line for ${ctx.todayName}, citing this weekday's history`,
      focusStrategy: { name: ctx.focusStrategy?.key ?? "", reason: "1-2 sentences with numbers", winRate: `${ctx.focusStrategy?.winRate ?? 0}%`, avgPnl: ctx.focusStrategy ? Math.round(ctx.focusStrategy.pnl / Math.max(1, ctx.focusStrategy.count)) : 0 },
      avoidStrategy: { name: ctx.avoidStrategy?.key ?? "None", reason: "1 sentence with numbers" },
      tradeLimit: { max: s?.recommendedMaxTrades ?? 3, reason: "1 sentence citing TRADES PER DAY" },
      confidenceThreshold: { min: s?.recommendedMinConfidence ?? 3, reason: "1 sentence citing CONFIDENCE CALIBRATION" },
      bestTimeWindows: [{ time: ctx.goodWindows[0]?.key ?? "09:00-10:00", reason: "1 sentence with win rate" }],
      emotionalAdvice: { watchFor: "emotional state from the data", tip: "1-2 sentences" },
      keyRules: ["Rule with a number from the data", "…max 4"],
      streakAdvice: "1 sentence about the current streak",
      marketFocus: "1 sentence about which symbols to focus on",
    },
    null,
    2
  )

  return `Write today's plan.

DATA
${lines.join("\n")}

${buildPromptContext(m, recent)}

Return one JSON object with exactly this shape:
${shape}`
}
