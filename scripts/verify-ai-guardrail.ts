/**
 * Checks for the AI output guardrail. No test runner is needed:
 *   npm run verify:ai
 * compiles this file with tsc (tsconfig.verify.json) and runs it with node.
 */
import assert from "node:assert/strict"
import { extractClaims, splitSentences } from "../lib/ai/guardrail/claims"
import { computeMetrics, tradeDay } from "../lib/ai/insights/compute-metrics"
import { fallbackFromMetrics } from "../lib/ai/insights/fallback"
import { buildPromptContext } from "../lib/ai/insights/prompt"
import { insightsPayloadSchema, type InsightTrade } from "../lib/ai/insights/types"
import { validateInsights } from "../lib/ai/insights/validate"
import { buildPlannerContext } from "../lib/ai/planner/context"
import { fallbackPlan } from "../lib/ai/planner/fallback"
import { validatePlan } from "../lib/ai/planner/validate"

let n = 0
const ok = (label: string) => {
  n++
  console.log(`  ok  ${label}`)
}

// ── Claim extraction ─────────────────────────────────────────────────────────
{
  const c = extractClaims(
    "You made Rs12,345 (₹1.2k on Mondays, -Rs 800 on Fridays, INR 2L overall) at 62% WR, 8pp better, over 14 trades and 3 consecutive losses. Sharpe 0.42 on 2026-09-01 at 09:15 with 4/5 confidence."
  )
  const by = (k: string) => c.filter((x) => x.kind === k).map((x) => (x.negative ? -x.value : x.value))
  assert.deepEqual(by("money"), [12345, 1200, -800, 200000])
  assert.deepEqual(by("percent"), [62, 8])
  assert.deepEqual(by("count"), [14, 3])
  assert.deepEqual(by("decimal"), [0.42])
  ok("extracts money (incl. k/L, ₹, INR, negatives), percents, counts, decimals; ignores dates, times, n/5")

  assert.deepEqual(extractClaims("Rs1,23,456 and Rs. 500.").map((x) => x.value), [123456, 500])
  assert.deepEqual(splitSentences("Made Rs. 500 today. Sharpe is 0.42. Good!"), ["Made Rs. 500 today.", "Sharpe is 0.42.", "Good!"])
  ok("handles Indian grouping and does not split sentences on Rs. or decimals")
}

// ── Date handling ────────────────────────────────────────────────────────────
{
  assert.equal(tradeDay("2026-09-07").weekday, "Monday")
  assert.equal(tradeDay("2026-09-11").weekday, "Friday")
  ok("weekday comes from the calendar date, independent of server timezone")
}

// ── Fixture: 40 trades over September 2026 ───────────────────────────────────
const STRATS = ["Breakout", "Reversal", "VWAP Bounce"]
const EMOTIONS = ["Calm", "Anxious", "Confident"]
const trades: InsightTrade[] = []
const dates: string[] = []
for (let d = 1; d <= 30; d++) {
  const date = `2026-09-${String(d).padStart(2, "0")}`
  const wd = tradeDay(date).weekday
  if (wd !== "Saturday" && wd !== "Sunday") dates.push(date)
}
for (let i = 0; i < 40; i++) {
  const date = dates[i % dates.length]
  const strat = STRATS[i % 3]
  const wd = tradeDay(date).weekday
  // Breakout wins, Reversal loses, Mondays are strong, Fridays weak.
  let pnl = strat === "Breakout" ? 1500 : strat === "Reversal" ? -900 : i % 2 === 0 ? 600 : -400
  if (wd === "Monday") pnl += 800
  if (wd === "Friday") pnl -= 700
  trades.push({
    id: `t${i}`,
    date,
    type: i % 2 ? "long" : "short",
    symbol: i % 4 === 0 ? "NIFTY" : "BANKNIFTY",
    strategy: strat,
    pnl,
    pnlPercent: 0,
    entryTime: `${9 + (i % 5)}:${i % 2 ? "20" : "45"}`,
    exitTime: `${10 + (i % 5)}:${i % 3 ? "05" : "50"}`,
    entryConfidence: 1 + (i % 5),
    satisfaction: 1 + ((i * 2) % 5),
    emotionalState: EMOTIONS[i % 3],
    quantity: 50,
    mistakes: i % 7 === 0 ? ["FOMO entry"] : [],
    createdAt: null,
  })
}
const NOW = new Date(2026, 8, 30, 12)
const metrics = computeMetrics(trades, NOW)
const s = metrics.signals!
const recent = [...trades].reverse()

// ── Metrics ──────────────────────────────────────────────────────────────────
{
  assert.equal(metrics.totalTrades, 40)
  assert.equal(metrics.winCount + metrics.lossCount + (metrics.breakevenCount ?? 0), 40)
  assert.equal(s.bestStrategy, "Breakout")
  assert.equal(s.worstStrategy, "Reversal")
  assert.equal(s.bestDay, "Monday")
  assert.ok(metrics.profitFactor! > 0)
  assert.ok(Math.abs(metrics.expectancy! - metrics.avgPnl) <= 1, "expectancy equals avg P&L")
  assert.equal(metrics.timeOfDay!.reduce((a, b) => a + b.count, 0), 40)
  ok("metrics add up and verdicts rank the obvious best/worst buckets")

  const ctx = buildPromptContext(metrics, recent)
  assert.ok(ctx.includes("COMPUTED VERDICTS"))
  assert.ok(ctx.includes(`Best setup: Breakout`))
  assert.ok(!/Rs-\d/.test(ctx), "negative money is written -Rs, not Rs-")
  ok("prompt carries computed verdicts and consistent money formatting")
}

// ── Insights guardrail ───────────────────────────────────────────────────────
const fallback = fallbackFromMetrics(metrics)
{
  const { auditor } = validateInsights(fallback, metrics, fallback, recent)
  const errors = auditor.issues.filter((i) => i.severity !== "info")
  assert.deepEqual(errors, [], "deterministic fallback must pass its own guardrail")
  const report = auditor.report({ attempts: 1, usedFallback: false })
  assert.equal(report.status, "verified")
  assert.ok(report.claimsChecked > 10)
  assert.equal(report.claimsVerified, report.claimsChecked)
  ok(`fallback text verifies cleanly (${report.claimsChecked} claims, ${report.fieldsChecked} fields)`)
}

{
  const breakout = metrics.strategies.find((b) => b.key === "Breakout")!
  const good = insightsPayloadSchema.parse({
    ...fallback,
    overallSummary: `You are up Rs${metrics.totalPnl.toLocaleString("en-IN")} over ${metrics.totalTrades} trades at a ${metrics.winRate}% win rate. Breakout is your best setup with Rs${breakout.pnl.toLocaleString("en-IN")}.`,
    strengths: [`Breakout: ${breakout.winRate}% WR across ${breakout.count} trades`],
  })
  const { payload, auditor } = validateInsights(good, metrics, fallback, recent)
  assert.equal(auditor.errorCount(), 0)
  assert.equal(payload.overallSummary, good.overallSummary)
  ok("accurate model text passes through unchanged")
}

{
  const wrongLevel = s.traderLevel === "expert" ? "beginner" : "expert"
  const bad = insightsPayloadSchema.parse({
    ...fallback,
    overallSummary: `You made Rs9,99,999 at a 91% win rate. Keep journaling consistently.`,
    strengths: ["Friday is your best day by far", "Disciplined sizing"],
    patterns: { ...fallback.patterns, bestDay: "Friday is your strongest day." },
    overtradingAnalysis: { ...fallback.overtradingAnalysis!, isOvertrading: !s.isOvertrading },
    traderLevel: wrongLevel,
    confidenceScore: 99,
    whatIfScenarios: [
      { scenario: "Skip Fridays", currentPnl: 1, projectedPnl: 123456, difference: 123455, advice: "Skip them" },
    ],
    personalizedRules: ["Never risk more than Rs7,777 per day."],
  })
  const { payload, auditor } = validateInsights(bad, metrics, fallback, recent)
  const report = auditor.report({ attempts: 1, usedFallback: false })
  if (process.env.VERBOSE) console.log(JSON.stringify(report.issues, null, 1))

  assert.equal(payload.overallSummary, "Keep journaling consistently.", "sentence with invented numbers is removed")
  assert.deepEqual(payload.strengths, ["Disciplined sizing"], "wrong best-day chip is dropped")
  assert.equal(payload.patterns.bestDay, fallback.patterns.bestDay, "wrong best day replaced")
  assert.equal(payload.overtradingAnalysis!.isOvertrading, s.isOvertrading)
  assert.equal(payload.traderLevel, s.traderLevel)
  assert.equal(payload.confidenceScore, s.compositeScore)
  assert.deepEqual(payload.whatIfScenarios, fallback.whatIfScenarios, "fabricated scenario replaced by computed ones")
  assert.deepEqual(payload.personalizedRules, ["Never risk more than Rs7,777 per day."], "advice targets are kept")
  assert.equal(report.status, "corrected")
  assert.ok(report.accuracy < 1)
  for (const kind of ["unverified_number", "wrong_entity", "inconsistent_field"]) {
    assert.ok(report.issues.some((i) => i.kind === kind), `reports ${kind}`)
  }
  assert.ok(report.issues.some((i) => i.path.startsWith("personalizedRules") && i.severity === "info"))
  ok(`hallucinated numbers, entities, verdicts and scenarios are caught and repaired (${report.issues.length} issues)`)
}

// ── Planner guardrail ────────────────────────────────────────────────────────
{
  const ctx = buildPlannerContext(metrics, trades, NOW)
  const fb = fallbackPlan(ctx)
  const clean = validatePlan(fb, ctx, fb)
  assert.equal(clean.auditor.issues.filter((i) => i.severity !== "info").length, 0, "planner fallback passes its own guardrail")
  ok("planner fallback verifies cleanly")

  const bad = {
    ...fb,
    focusStrategy: { name: "Scalping", reason: "It has a 95% win rate.", winRate: "95%", avgPnl: 99999 },
    avoidStrategy: { name: "Breakout", reason: "Breakout loses money." },
    tradeLimit: { max: 25, reason: "Trade a lot." },
    confidenceThreshold: { min: 9, reason: "High bar." },
    bestTimeWindows: [{ time: "15:45 - 16:30", reason: "After hours." }],
  }
  const { plan, auditor } = validatePlan(bad, ctx, fb)
  assert.equal(plan.focusStrategy!.name, fb.focusStrategy!.name, "unknown focus strategy replaced")
  assert.equal(plan.focusStrategy!.winRate, fb.focusStrategy!.winRate)
  assert.notEqual(plan.avoidStrategy!.name, "Breakout", "avoid strategy cannot be a profitable one")
  assert.ok(plan.tradeLimit!.max >= 1 && plan.tradeLimit!.max <= 10)
  assert.ok(plan.confidenceThreshold!.min >= 1 && plan.confidenceThreshold!.min <= 5)
  assert.ok(plan.bestTimeWindows!.every((w) => metrics.timeOfDay!.some((t) => t.key === w.time)))
  assert.ok(auditor.errorCount() >= 4)
  ok(`planner rejects unknown strategies, out-of-range limits and windows (${auditor.issues.length} issues)`)
}

console.log(`\n${n} checks passed`)
