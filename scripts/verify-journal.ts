/**
 * Checks for the journal maths (R-multiples, discipline score, mistake costs,
 * CSV export, calculators). No test runner is needed:
 *   npm run verify:journal
 * compiles this file with tsc (tsconfig.verify.json) and runs it with node.
 */
import assert from "node:assert/strict"
import { computeMetrics } from "../lib/ai/insights/compute-metrics"
import { buildInsightFacts } from "../lib/ai/insights/facts"
import { buildPromptContext } from "../lib/ai/insights/prompt"
import type { InsightTrade } from "../lib/ai/insights/types"
import {
  compounding,
  INDEX_LOTS,
  lotCalc,
  positionSize,
  recoveryGainPercent,
  riskReward,
} from "../lib/journal/calculators"
import { CSV_HEADERS, csvText, htmlToText, tradesToCsv, type ExportTrade } from "../lib/journal/csv"
import {
  detectRevengeTrades,
  disciplineScore,
  entryMinute,
  type DisciplineInput,
} from "../lib/journal/discipline"
import { formatR, inr, parseNum } from "../lib/journal/format"
import { mistakeCosts } from "../lib/journal/mistakes"
import { summarizeR, tradeR } from "../lib/journal/r-multiple"

let n = 0
const ok = (label: string) => {
  n++
  console.log(`  ok  ${label}`)
}
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`)

// ── R-multiples ──────────────────────────────────────────────────────────────
{
  near(tradeR({ type: "long", entryPrice: 100, exitPrice: 104, stopLoss: 98 })!, 2)
  near(tradeR({ type: "long", entryPrice: 100, exitPrice: 98, stopLoss: 98 })!, -1)
  near(tradeR({ type: "short", entryPrice: 100, exitPrice: 97, stopLoss: 103 })!, 1)
  near(tradeR({ type: "short", entryPrice: 100, exitPrice: 106, stopLoss: 103 })!, -2)
  near(tradeR({ direction: "SELL", entryPrice: 100, exitPrice: 97, stopLoss: 103 })!, 1)
  ok("R is (move / initial risk) for longs and shorts, from prices")

  assert.equal(tradeR({ type: "long", entryPrice: 100, exitPrice: 104 }), null)
  assert.equal(tradeR({ type: "long", entryPrice: 100, exitPrice: 104, stopLoss: 0 }), null)
  assert.equal(tradeR({ type: "long", entryPrice: 100, exitPrice: 104, stopLoss: 101 }), null)
  assert.equal(tradeR({ type: "short", entryPrice: 100, exitPrice: 97, stopLoss: 99 }), null)
  assert.equal(tradeR({ type: "long", entryPrice: 100, exitPrice: 100, stopLoss: 100 }), null)
  ok("no R when the stop is missing, zero, or on the wrong side of entry")

  const s = summarizeR([
    { type: "long", entryPrice: 100, exitPrice: 104, stopLoss: 98 }, // +2
    { type: "long", entryPrice: 100, exitPrice: 99, stopLoss: 98 }, // -0.5
    { type: "short", entryPrice: 50, exitPrice: 49, stopLoss: 52 }, // +0.5
    { type: "long", entryPrice: 100, exitPrice: 120 }, // skipped
  ])
  assert.equal(s.measured, 3)
  assert.equal(s.skipped, 1)
  near(s.avgR, 2 / 3)
  near(s.totalR, 2)
  near(s.avgWinR, 1.25)
  near(s.avgLossR, -0.5)
  near(s.bestR, 2)
  near(s.worstR, -0.5)
  assert.equal(summarizeR([]).avgR, 0)
  ok("summary averages measured trades only and reports how many were skipped")

  assert.equal(formatR(0.6234), "+0.62R")
  assert.equal(formatR(-1), "-1.00R")
  ok("formats R with an explicit sign")
}

// ── Revenge detection ────────────────────────────────────────────────────────
{
  assert.equal(entryMinute({ date: "2026-09-01", entryTime: "09:15" })! - entryMinute({ date: "2026-09-01", entryTime: "09:00:30" })!, 15)
  assert.equal(
    entryMinute({ date: "2026-09-01", entryTime: "02:15 PM" }),
    entryMinute({ date: "2026-09-01", entryTime: "14:15" })
  )
  assert.equal(entryMinute({ date: "2026-09-01", entryTime: "12:05 AM" })! - entryMinute({ date: "2026-09-01", entryTime: "00:00" })!, 5)
  assert.equal(entryMinute({ date: "2026-09-01", entryTime: "garbage" }), null)
  assert.equal(entryMinute({ date: "2026-09-01", entryTime: null }), null)
  assert.equal(entryMinute({ date: "bad", entryTime: "09:15" }), null)
  ok("parses 24h and AM/PM entry times, rejects junk")

  const trades = [
    { date: "2026-09-01", entryTime: "11:05", pnl: 200, id: "c" },
    { date: "2026-09-01", entryTime: "09:20", pnl: -100, id: "a" },
    { date: "2026-09-01", entryTime: "09:35", pnl: 50, id: "b" }, // 15 min after a loss: medium
    { date: "2026-09-01", entryTime: "11:00", pnl: -30, id: "x" },
    { date: "2026-09-01", entryTime: null, pnl: -999, id: "untimed" },
  ]
  const hits = detectRevengeTrades(trades)
  assert.deepEqual(hits.map((h) => [h.trade.id, h.afterLoss.id, h.gapMinutes, h.severity]), [
    ["b", "a", 15, "medium"],
    ["c", "x", 5, "high"],
  ])
  ok("flags a trade within 30 min of a loss, sorts unordered input, ignores untimed trades")

  const crossDay = detectRevengeTrades([
    { date: "2026-09-01", entryTime: "15:20", pnl: -500 },
    { date: "2026-09-02", entryTime: "09:15", pnl: 100 },
  ])
  assert.equal(crossDay.length, 0)
  assert.equal(detectRevengeTrades([{ date: "2026-09-01", entryTime: "09:15", pnl: -1 }, { date: "2026-09-01", entryTime: "09:46", pnl: 1 }]).length, 0)
  assert.equal(detectRevengeTrades([{ date: "2026-09-01", entryTime: "09:15", pnl: 5 }, { date: "2026-09-01", entryTime: "09:20", pnl: 1 }]).length, 0)
  ok("does not flag across days, past the window, or after a winner")
}

// ── Discipline score ─────────────────────────────────────────────────────────
{
  const few = disciplineScore([{ date: "2026-09-01", pnl: 1 }])
  assert.equal(few.ready, false)
  assert.equal(few.score, null)
  ok("not ready below 5 trades")

  // 10 trades on 10 different days: 5 with a stop, 2 with a mistake, no revenge.
  const base: DisciplineInput[] = Array.from({ length: 10 }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, "0")}`,
    entryTime: "10:00",
    pnl: i % 2 === 0 ? 100 : -50,
    stopLoss: i < 5 ? 90 : null,
    mistakes: i < 2 ? ["FOMO"] : i === 2 ? ["No Mistakes"] : [],
  }))
  const d = disciplineScore(base)
  const by = Object.fromEntries(d.components.map((c) => [c.key, c.value]))
  assert.deepEqual(by, { stopLoss: 50, revengeFree: 100, mistakeFree: 80, pace: 100 })
  assert.equal(d.score, 80) // (50*30 + 100*30 + 80*25 + 100*15) / 100
  assert.equal(d.band, "Strong")
  assert.equal(d.revengeCount, 0)
  ok("weights 30/30/25/15, and a 'No Mistakes' tag is not a mistake")

  const untimed = disciplineScore(base.map((t) => ({ ...t, entryTime: null })))
  assert.equal(untimed.components.find((c) => c.key === "revengeFree")!.value, null)
  assert.equal(untimed.score, Math.round((50 * 30 + 80 * 25 + 100 * 15) / 70)) // weights rescale over what is measured
  ok("an unmeasurable habit is dropped and weights rescale, not scored as zero or perfect")

  const busy = disciplineScore(
    Array.from({ length: 10 }, (_, i) => ({ date: "2026-09-01", entryTime: `${9 + Math.floor(i / 2)}:${i % 2 ? "40" : "00"}`, pnl: 10, stopLoss: 5 }))
  )
  assert.equal(busy.components.find((c) => c.key === "pace")!.value, 0)
  ok("ten trades in one day fails the daily cap")
}

// ── Mistake costs ────────────────────────────────────────────────────────────
{
  const costs = mistakeCosts([
    { pnl: -500, mistakes: ["FOMO", "Oversized"] },
    { pnl: -300, mistakes: ["FOMO", "FOMO"] },
    { pnl: 400, mistakes: ["Oversized"] },
    { pnl: 100, mistakes: ["No Mistakes"] },
    { pnl: 100, mistakes: [] },
    { pnl: 100 },
  ])
  assert.deepEqual(
    costs.map((c) => [c.mistake, c.count, c.totalPnl]),
    [
      ["FOMO", 2, -800],
      ["Oversized", 2, -100],
    ]
  )
  near(costs[0].avgPnl, -400)
  ok("costs most-negative first, de-duplicates a tag on one trade, skips 'No Mistakes'")
}

// ── CSV ──────────────────────────────────────────────────────────────────────
{
  assert.equal(csvText("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`)
  assert.equal(csvText("+91 trade"), "'+91 trade")
  assert.equal(csvText("-1"), "'-1")
  assert.equal(csvText("@cmd"), "'@cmd")
  assert.equal(csvText("plain"), "plain")
  assert.equal(csvText("a,b"), '"a,b"')
  assert.equal(csvText(null), "")
  ok("neutralises spreadsheet formula starts and quotes commas")

  assert.equal(htmlToText("<p>Took it &amp; held.</p><p>Second&nbsp;line<br>third</p>"), "Took it & held.\nSecond line\nthird")
  assert.equal(htmlToText(null), "")
  ok("rich-text notes export as plain text")

  const trade: ExportTrade = {
    date: "2026-09-01",
    symbol: "NIFTY 25000 CE",
    type: "long",
    quantity: 130,
    entryPrice: 100,
    exitPrice: 104,
    stopLoss: 98,
    pnl: -250.5,
    pnlPercent: -1.234,
    brokerage: 47.5,
    mistakes: ["FOMO", "Oversized"],
    notes: "<p>Line one, with comma</p><p>=2+2</p>",
  }
  const csv = tradesToCsv([trade, { ...trade, symbol: "=cmd", pnl: 10 }])
  const lines = csv.split("\r\n")
  assert.equal(lines.length, 4) // header + 2 rows + trailing empty
  assert.equal(lines[0].split(",").length, CSV_HEADERS.length)
  assert.ok(lines[1].includes(",-250.5,-1.23,47.5,-298,2.00,"), lines[1]) // numbers stay numeric: P&L, %, charges, net, R
  assert.ok(lines[1].includes("FOMO; Oversized"))
  // Only the start of a cell can trigger a formula, so a later line starting with "=" needs no prefix.
  assert.ok(lines[1].includes('"Line one, with comma\n=2+2"'), lines[1])
  assert.ok(lines[2].includes(",'=cmd,"))
  ok("rows keep numbers numeric, add charges, net P&L and R, and escape text safely")
}

// ── Calculators ──────────────────────────────────────────────────────────────
{
  const p = positionSize({ capital: 100000, riskPercent: 1, entry: 100, stop: 95 })
  assert.ok(p.ok)
  if (p.ok) {
    assert.equal(p.direction, "long")
    assert.equal(p.riskAmount, 1000)
    assert.equal(p.quantity, 200)
    assert.equal(p.positionValue, 20000)
    assert.equal(p.positionPercentOfCapital, 20)
    assert.equal(p.maxLoss, 1000)
    assert.equal(p.lots, null)
  }

  const lots = positionSize({ capital: 100000, riskPercent: 1, entry: 100, stop: 95, lotSize: 75, target: 115 })
  assert.ok(lots.ok)
  if (lots.ok) {
    assert.equal(lots.lots, 2) // floor(200 / 75)
    assert.equal(lots.quantity, 150)
    assert.equal(lots.maxLoss, 750)
    near(lots.reward!.ratio, 3)
    assert.equal(lots.reward!.amount, 2250)
  }

  const short = positionSize({ capital: 50000, riskPercent: 2, entry: 200, stop: 210 })
  assert.ok(short.ok && short.direction === "short" && short.quantity === 100)

  const tiny = positionSize({ capital: 10000, riskPercent: 0.5, entry: 100, stop: 90, lotSize: 65 })
  assert.ok(tiny.ok && tiny.quantity === 0 && tiny.warnings.length > 0)

  const wrongTarget = positionSize({ capital: 100000, riskPercent: 1, entry: 100, stop: 95, target: 90 })
  assert.ok(wrongTarget.ok && wrongTarget.reward === null && wrongTarget.warnings.length === 1)

  assert.ok(!positionSize({ capital: 100000, riskPercent: 1, entry: 100, stop: 100 }).ok)
  assert.ok(!positionSize({ capital: 0, riskPercent: 1, entry: 100, stop: 95 }).ok)
  assert.ok(!positionSize({ capital: 1000, riskPercent: 150, entry: 100, stop: 95 }).ok)
  assert.ok(!positionSize({}).ok)
  ok("position size: risk budget / risk per unit, lot rounding, direction, warnings, validation")

  const rr = riskReward({ entry: 100, stop: 95, target: 110, quantity: 10 })
  assert.ok(rr.ok)
  if (rr.ok) {
    near(rr.ratio, 2)
    near(rr.breakevenWinRate, 100 / 3)
    assert.deepEqual(rr.amounts, { risk: 50, reward: 100 })
  }
  const rrShort = riskReward({ entry: 100, stop: 105, target: 90 })
  assert.ok(rrShort.ok && rrShort.direction === "short" && rrShort.ratio === 2)
  assert.ok(!riskReward({ entry: 100, stop: 95, target: 99 }).ok)
  ok("risk:reward ratio, breakeven win rate, short side, wrong-side target rejected")

  const c = compounding({ principal: 100000, ratePercent: 10, periods: 2 })
  assert.ok(c.ok)
  if (c.ok) near(c.finalValue, 121000, 1e-6)
  const cc = compounding({ principal: 1000, ratePercent: 0, periods: 12, contribution: 100 })
  assert.ok(cc.ok)
  if (cc.ok) {
    near(cc.finalValue, 2200)
    near(cc.gain, 0)
    assert.equal(cc.rows.length, 12)
  }
  assert.ok(!compounding({ principal: 1000, ratePercent: -100, periods: 5 }).ok)
  assert.ok(!compounding({ principal: 1000, ratePercent: 5, periods: 0 }).ok)
  assert.ok(!compounding({ principal: 1000, ratePercent: 5, periods: 601 }).ok)
  near(recoveryGainPercent(50)!, 100)
  near(recoveryGainPercent(20)!, 25)
  assert.equal(recoveryGainPercent(100), null)
  ok("compounding with contributions, bounds, and drawdown recovery")

  assert.equal(INDEX_LOTS.find((l) => l.symbol === "NIFTY")!.lotSize, 65)
  assert.equal(INDEX_LOTS.find((l) => l.symbol === "BANKNIFTY")!.lotSize, 30)
  const lot = lotCalc({ lotSize: 65, lots: 2, price: 100, stopPoints: 10, targetPoints: 25 })
  assert.ok(lot.ok)
  if (lot.ok) {
    assert.equal(lot.quantity, 130)
    assert.equal(lot.value, 13000)
    assert.equal(lot.atStop, 1300)
    assert.equal(lot.atTarget, 3250)
  }
  assert.ok(!lotCalc({ lotSize: 65, lots: 1.5, price: 100 }).ok)
  ok("lot calculator and the verified NSE lot sizes")

  assert.equal(inr(-1234567), "-₹12,34,567")
  assert.equal(inr(1234.5, 2), "₹1,234.50")
  assert.equal(parseNum("1,50,000"), 150000)
  assert.equal(parseNum(""), undefined)
  assert.equal(parseNum("abc"), undefined)
  ok("Indian digit grouping and tolerant number parsing")
}

// ── AI pipeline integration ──────────────────────────────────────────────────
{
  const trades: InsightTrade[] = Array.from({ length: 12 }, (_, i) => ({
    id: `t${i}`,
    date: `2026-08-${String(i + 1).padStart(2, "0")}`,
    type: "long",
    symbol: "NIFTY",
    strategy: "Breakout",
    pnl: i % 3 === 0 ? -200 : 150,
    pnlPercent: 1,
    entryTime: "10:00",
    exitTime: "10:30",
    entryConfidence: 3,
    satisfaction: 3,
    emotionalState: "calm",
    quantity: 65,
    mistakes: i % 4 === 0 ? ["FOMO"] : [],
    stopLoss: i < 6 ? 90 : null,
    createdAt: null,
  }))
  const m = computeMetrics(trades, new Date("2026-08-20T00:00:00Z"))
  assert.ok(m.discipline?.ready)
  assert.equal(m.skillScores.discipline, m.discipline!.score)
  ok("computeMetrics attaches the discipline score and the radar skill uses the same number")

  const facts = buildInsightFacts(m, trades)
  const stopLossPct = m.discipline!.components.find((c) => c.key === "stopLoss")!.value!
  const claim = (kind: "count" | "percent", value: number) => ({ kind, value, negative: false, precision: 0, raw: String(value), index: 0 })
  assert.ok(facts.match(claim("count", m.discipline!.score!)).ok)
  assert.ok(facts.match(claim("percent", stopLossPct)).ok)
  const prompt = buildPromptContext(m, trades)
  assert.ok(prompt.includes("=== DISCIPLINE (0-100, computed in code) ==="))
  assert.ok(prompt.includes(`Discipline score: ${m.discipline!.score}`))
  ok("discipline numbers are in the fact sheet and the prompt, so the guardrail accepts them")

  const old = computeMetrics(trades.slice(0, 3), new Date("2026-08-20T00:00:00Z"))
  assert.equal(old.discipline!.ready, false)
  assert.ok(!buildPromptContext(old, trades).includes("=== DISCIPLINE"))
  ok("a short journal leaves the discipline section out instead of inventing a score")
}

console.log(`\n${n} journal checks passed`)
