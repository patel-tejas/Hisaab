import { Auditor, type EntityGroup } from "../guardrail/auditor"
import { buildInsightFacts } from "../insights/facts"
import type { PlannerContext } from "./context"
import { windowToSlot } from "./context"
import type { DailyPlan } from "./types"

function finite(n: number): number | undefined {
  return Number.isFinite(n) ? n : undefined
}

function sameName(a: string | undefined, b: string): boolean {
  return (a ?? "").trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Check a daily plan against the trader's data and repair it:
 * strategies must exist (and the one to avoid must actually lose money),
 * win rate / avg P&L are recomputed, limits are kept in sane ranges, time
 * windows must be profitable slots the trader actually trades, and numbers
 * in the reasons must match the data.
 */
export function validatePlan(raw: DailyPlan, ctx: PlannerContext, fallback: DailyPlan): { plan: DailyPlan; auditor: Auditor } {
  const m = ctx.metrics
  const s = m.signals
  const facts = buildInsightFacts(m)
  for (const b of ctx.todayStrategies) {
    facts.money(b.pnl, `${ctx.todayName} ${b.key} P&L`)
    facts.percent(b.winRate, `${ctx.todayName} ${b.key} win rate`)
    facts.count(b.count, `${ctx.todayName} ${b.key} trades`)
    if (b.count > 0) facts.money(Math.round(b.pnl / b.count), `${ctx.todayName} ${b.key} avg P&L`)
  }
  const groups: EntityGroup[] = [
    { nouns: ["setup", "strategy", "edge", "play"], entities: m.strategies.map((b) => b.key), best: s?.bestStrategy ?? null, worst: s?.worstStrategy ?? null },
    { nouns: ["day", "weekday"], entities: m.dayOfWeek.map((b) => b.key), best: s?.bestDay ?? null, worst: s?.worstDay ?? null },
  ]
  const a = new Auditor(facts, groups)

  // Focus strategy: must be a strategy the trader has, with its real stats.
  let focusBucket = m.strategies.find((b) => sameName(raw.focusStrategy?.name, b.key))
  let focusReason = raw.focusStrategy?.reason
  if (!focusBucket || (focusBucket.pnl <= 0 && focusBucket.key !== ctx.focusStrategy?.key)) {
    a.note({
      path: "focusStrategy.name",
      kind: focusBucket ? "inconsistent_field" : "unknown_reference",
      severity: "error",
      message: focusBucket
        ? `${focusBucket.key} is not profitable, so it cannot be today's focus.`
        : `"${raw.focusStrategy?.name ?? ""}" is not a strategy in your journal.`,
      claim: raw.focusStrategy?.name,
      expected: fallback.focusStrategy?.name,
      action: "replaced",
    })
    focusBucket = ctx.focusStrategy ?? undefined
    focusReason = fallback.focusStrategy?.reason
  }
  const focusStrategy = focusBucket
    ? {
        name: focusBucket.key,
        reason: a.text("focusStrategy.reason", focusReason, "strict", fallback.focusStrategy?.reason),
        winRate: `${a.field("focusStrategy.winRate", finite(parseFloat(raw.focusStrategy?.winRate ?? "")), focusBucket.winRate, { tolerance: 1, label: "Focus win rate" })}%`,
        avgPnl: a.field("focusStrategy.avgPnl", raw.focusStrategy?.avgPnl, Math.round(focusBucket.pnl / Math.max(1, focusBucket.count)), {
          tolerance: Math.max(2, Math.abs(focusBucket.pnl / Math.max(1, focusBucket.count)) * 0.02),
          label: "Focus avg P&L",
        }),
      }
    : undefined

  // Avoid strategy: must exist and lose money; "None" is fine when nothing loses.
  let avoidStrategy = raw.avoidStrategy
  const avoidBucket = m.strategies.find((b) => sameName(raw.avoidStrategy?.name, b.key))
  const saysNone = !raw.avoidStrategy?.name || /^(none|n\/a|-)$/i.test(raw.avoidStrategy.name.trim())
  if (saysNone ? ctx.avoidStrategy !== null : !avoidBucket || avoidBucket.pnl >= 0 || avoidBucket.key === focusStrategy?.name) {
    a.note({
      path: "avoidStrategy.name",
      kind: avoidBucket || saysNone ? "inconsistent_field" : "unknown_reference",
      severity: "error",
      message: avoidBucket && avoidBucket.pnl >= 0
        ? `${avoidBucket.key} is profitable (Rs${avoidBucket.pnl.toLocaleString("en-IN")}), so it should not be avoided.`
        : `Avoid pick "${raw.avoidStrategy?.name ?? ""}" does not match your losing strategies.`,
      claim: raw.avoidStrategy?.name,
      expected: fallback.avoidStrategy?.name,
      action: "replaced",
    })
    avoidStrategy = fallback.avoidStrategy
  } else if (avoidStrategy) {
    avoidStrategy = {
      name: avoidBucket?.key ?? avoidStrategy.name,
      reason: a.text("avoidStrategy.reason", avoidStrategy.reason, "strict", fallback.avoidStrategy?.reason),
    }
  }

  // Trade limit: whole number, 1-10, not far above what the data supports.
  const recMax = s?.recommendedMaxTrades ?? fallback.tradeLimit?.max ?? 3
  const rawMax = Math.round(raw.tradeLimit?.max ?? 0)
  const maxOk = rawMax >= 1 && rawMax <= Math.min(10, recMax + 2)
  const tradeLimit = {
    max: maxOk ? rawMax : a.field("tradeLimit.max", rawMax, recMax, { label: "Trade limit" }),
    reason: maxOk
      ? a.text("tradeLimit.reason", raw.tradeLimit?.reason, "strict", fallback.tradeLimit?.reason)
      : fallback.tradeLimit?.reason ?? "",
  }

  // Confidence floor: 1-5 and close to the computed floor.
  const recMin = s?.recommendedMinConfidence ?? fallback.confidenceThreshold?.min ?? 3
  const rawMin = Math.round(raw.confidenceThreshold?.min ?? 0)
  const minOk = rawMin >= 1 && rawMin <= 5 && Math.abs(rawMin - recMin) <= 1
  const confidenceThreshold = {
    min: minOk ? rawMin : a.field("confidenceThreshold.min", rawMin, recMin, { label: "Confidence floor" }),
    reason: minOk
      ? a.text("confidenceThreshold.reason", raw.confidenceThreshold?.reason, "strict", fallback.confidenceThreshold?.reason)
      : fallback.confidenceThreshold?.reason ?? "",
  }

  // Time windows: must start in a slot the trader trades profitably.
  const windows: DailyPlan["bestTimeWindows"] = []
  raw.bestTimeWindows.forEach((w, i) => {
    const slot = windowToSlot(w.time)
    const bucket = ctx.goodWindows.find((g) => g.key === slot)
    if (!bucket || windows.some((x) => x.time === bucket.key)) {
      a.note({
        path: `bestTimeWindows[${i}]`,
        kind: "unknown_reference",
        severity: "error",
        message: `"${w.time}" is not a window where you trade profitably.`,
        claim: w.time,
        action: "removed",
      })
      return
    }
    windows.push({ time: bucket.key, reason: a.text(`bestTimeWindows[${i}].reason`, w.reason, "strict", fallback.bestTimeWindows[0]?.reason ?? "") })
  })

  const plan: DailyPlan = {
    greeting: a.text("greeting", raw.greeting, "strict", fallback.greeting),
    focusStrategy,
    avoidStrategy,
    tradeLimit,
    confidenceThreshold,
    bestTimeWindows: windows.length ? windows : fallback.bestTimeWindows,
    emotionalAdvice: raw.emotionalAdvice
      ? {
          watchFor: raw.emotionalAdvice.watchFor,
          tip: a.text("emotionalAdvice.tip", raw.emotionalAdvice.tip, "strict", fallback.emotionalAdvice?.tip),
        }
      : fallback.emotionalAdvice,
    keyRules: a.list("keyRules", raw.keyRules, "lenient", fallback.keyRules, 5),
    streakAdvice: a.text("streakAdvice", raw.streakAdvice, "lenient", fallback.streakAdvice),
    marketFocus: a.text("marketFocus", raw.marketFocus, "strict", fallback.marketFocus),
  }

  return { plan, auditor: a }
}
