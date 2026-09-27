import assert from "node:assert/strict";
import { coerceArgs, isReadTool, READ_TOOLS, WRITE_TOOLS } from "../lib/eve/bridge";
import { describeStrategy, normalizeParams, DEFAULT_PARAMS } from "../lib/eve/strategy";
import { tradesToEquity, formatMetric, metricSentiment } from "../components/eve/metrics";
import { listSkills, getSkill, splitSections, skillSkeleton } from "../lib/eve/skills";
import { analyzeIntegrity } from "../components/eve/integrity";

let n = 0;
const ok = (label: string) => { n++; console.log(`  ok  ${label}`); };

// --- allowlist ------------------------------------------------------------
assert.equal(isReadTool("run_backtest_signals"), true);
for (const w of WRITE_TOOLS) assert.equal(isReadTool(w), false, `${w} must be blocked`);
assert.equal(isReadTool("../../etc/passwd"), false);
assert.equal(READ_TOOLS.length, 9);
ok("allowlist admits 9 read tools, blocks both write tools");

// --- arg coercion: the string-args bug that broke the old tab -------------
const schema = { type: "object", properties: {
  month: { type: "string" }, limit: { type: "integer" },
  angle_threshold: { type: "number" }, include_trades: { type: "boolean" },
}} as any;
const c = coerceArgs({ month: "2026-07", limit: "200", angle_threshold: "30.5", include_trades: "true" }, schema);
assert.equal(c.limit, 200); assert.equal(typeof c.limit, "number");
assert.equal(c.angle_threshold, 30.5);
assert.equal(c.include_trades, true);
ok('string args coerced: limit "200" -> 200 (number)');

assert.equal(coerceArgs({ include_trades: "false" }, schema).include_trades, false);
assert.equal(coerceArgs({ include_trades: "0" }, schema).include_trades, false);
assert.equal(coerceArgs({ include_trades: true }, schema).include_trades, true);
ok('boolean "false"/"0" -> false (Python would read both as true)');

assert.equal("limit" in coerceArgs({ limit: "" }, schema), false);
ok("empty string dropped rather than sent as 0");

// --- fast < slow invariant ------------------------------------------------
const bad = normalizeParams({ ...DEFAULT_PARAMS, month: "2026-07", fast_ema: 20, slow_ema: 15 });
assert.ok(bad.fast_ema < bad.slow_ema, "fast must end up below slow");
assert.equal(bad.slow_ema, 21);
ok(`fast 20 / slow 15 repaired to ${bad.fast_ema}/${bad.slow_ema}`);

// --- plain-English template ---------------------------------------------
const d = describeStrategy({ ...DEFAULT_PARAMS, month: "2026-07", fast_ema: 9, slow_ema: 21, angle_threshold: 35 });
assert.ok(d.includes("9-bar") && d.includes("21-bar") && d.includes("35°"), d);
assert.ok(d.includes("next candle's open"), "must state the fill model");
const noGate = describeStrategy({ ...DEFAULT_PARAMS, month: "2026-07", signal_mode: "crossover" });
assert.ok(!noGate.includes("°"), "crossover-only must not mention steepness");
ok("template tracks params and omits the gate for variant A");

// --- equity from trades --------------------------------------------------
const trades = [
  { trade_id: 1, entry_time: "2026-07-10T09:30", exit_time: "2026-07-13T09:30", direction: "LONG", entry_price: 0, exit_price: 0, quantity: 50, gross_pnl: 0, costs: 0, net_pnl: -8090.5 },
  { trade_id: 4, entry_time: "2026-07-24T13:00", exit_time: "2026-07-31T15:15", direction: "LONG", entry_price: 0, exit_price: 0, quantity: 50, gross_pnl: 0, costs: 0, net_pnl: 26908.5 },
  { trade_id: 2, entry_time: "2026-07-14T09:45", exit_time: "2026-07-15T09:45", direction: "SHORT", entry_price: 0, exit_price: 0, quantity: 50, gross_pnl: 0, costs: 0, net_pnl: -4890.9 },
];
const eq = tradesToEquity(trades);
assert.deepEqual(eq.map((p) => p.i), [1, 2, 3]);
assert.equal(eq[0].time, "2026-07-13T09:30", "sorted by exit time");
assert.ok(Math.abs(eq.at(-1)!.cumulative - 13927.1) < 0.01, String(eq.at(-1)!.cumulative));
assert.ok(eq[1].drawdown < 0 && eq.at(-1)!.drawdown === 0);
ok(`cumulative curve sorted by exit, ends at ${eq.at(-1)!.cumulative.toFixed(2)}`);

// --- metric formatting + decision-rule bands ----------------------------
assert.equal(formatMetric("net_pnl", 5736.63), "+₹5,737");
assert.equal(formatMetric("net_pnl", -11308), "-₹11,308");
assert.equal(formatMetric("win_rate", 0.25), "25.0%");
assert.equal(formatMetric("sharpe", null), "—");
ok("INR / percent / null formatting");

assert.equal(metricSentiment("profit_factor", 1.35), "pos");
assert.equal(metricSentiment("profit_factor", 1.1), "warn");
assert.equal(metricSentiment("profit_factor", 0.69), "neg");
assert.equal(metricSentiment("total_trades", 4), "warn");
ok("PF bands follow the project decision rule (>1.25 passes)");

// --- skills + progressive disclosure ------------------------------------
const skills = listSkills();
assert.deepEqual(skills.map((s) => s.name).sort(), ["backtest-diagnose", "ema-strategy", "futures-backtesting", "quant-statistics", "research-workflows"]);
assert.ok(skills.every((s) => s.description.length > 40), "descriptions must survive folding");
ok(`${skills.length} skills loaded with folded descriptions`);

const fb = getSkill("futures-backtesting")!;
const skel = skillSkeleton(fb);
assert.ok(skel.sections.includes("Contract specs (NIFTY index futures)"), skel.sections.join(" | "));
const costs = splitSections(fb.body).find((s) => s.heading.startsWith("Costs"))!;
assert.ok(costs.content.includes("Rs 423"), "corrected round-trip cost must be present");
assert.ok(!costs.content.includes("330"), "stale Rs 330 figure must be gone");
assert.ok(fb.body.includes("65") && fb.body.includes("Rs 0.10"), "real contract specs");
ok(`sections exposed by name (${skel.sections.length}); costs corrected to Rs 423`);

const ema = getSkill("ema-strategy")!;
assert.ok(ema.body.includes("RSI"), "must name RSI as unsupported");
ok("ema-strategy documents the unsupported list");

console.log(`\n${n} checks passed`);

// --- integrity analysis against the REAL July 15m result ----------------

const july = {
  month: "2026-07", timeframe: "15m", config: {}, slippage: "normal",
  metrics: { net_pnl: 5736.63671700029, profit_factor: 1.3511033969749748 } as any,
  equity: { start: 0, end: 0, bars: 0 },
  trades: [
    { trade_id: 1, entry_time: "2026-07-10T09:30:00", exit_time: "2026-07-13T09:30:00", direction: "LONG",  entry_price: 0, exit_price: 0, quantity: 50, gross_pnl: 0, costs: 0, net_pnl: -8090.5 },
    { trade_id: 2, entry_time: "2026-07-14T09:45:00", exit_time: "2026-07-15T09:45:00", direction: "SHORT", entry_price: 0, exit_price: 0, quantity: 50, gross_pnl: 0, costs: 0, net_pnl: -4890.9 },
    { trade_id: 3, entry_time: "2026-07-15T13:15:00", exit_time: "2026-07-17T09:45:00", direction: "SHORT", entry_price: 0, exit_price: 0, quantity: 50, gross_pnl: 0, costs: 0, net_pnl: -8190.5 },
    { trade_id: 4, entry_time: "2026-07-24T13:00:00", exit_time: "2026-07-31T15:15:00", direction: "LONG",  entry_price: 0, exit_price: 0, quantity: 50, gross_pnl: 0, costs: 0, net_pnl: 26908.5 },
  ],
};

const a = analyzeIntegrity(july as any)!;
assert.equal(a.lotUsed, 50);
assert.equal(a.lotWrong, true);
assert.equal(a.overnight.length, 4, "all four July trades cross a session boundary");
assert.equal(a.allOvernight, true);
assert.equal(a.intraday.length, 0);
assert.equal(a.dependsOnOvernight, true, "must flag that the +5,737 rests on overnight holds");
assert.equal(a.clean, false);
ok("July 15m flagged: lot 50, all 4 trades overnight, headline depends on them");

// A genuinely clean result must not nag.
const clean = { ...july, trades: [
  { trade_id: 1, entry_time: "2026-07-10T09:30:00", exit_time: "2026-07-10T14:30:00", direction: "LONG", entry_price: 0, exit_price: 0, quantity: 65, gross_pnl: 0, costs: 0, net_pnl: 900 },
]};
const b = analyzeIntegrity(clean as any)!;
assert.equal(b.clean, true, "lot 65 + intraday exit = nothing to warn about");
assert.equal(b.dependsOnOvernight, false);
ok("correct lot + intraday exits produces no warning");

// Mixed case: positive only because of the overnight leg.
const mixed = { ...july, trades: [
  { trade_id: 1, entry_time: "2026-07-10T09:30:00", exit_time: "2026-07-10T14:30:00", direction: "LONG", entry_price: 0, exit_price: 0, quantity: 65, gross_pnl: 0, costs: 0, net_pnl: -500 },
  { trade_id: 2, entry_time: "2026-07-11T09:30:00", exit_time: "2026-07-14T14:30:00", direction: "LONG", entry_price: 0, exit_price: 0, quantity: 65, gross_pnl: 0, costs: 0, net_pnl: 3000 },
]};
const m = analyzeIntegrity(mixed as any)!;
assert.equal(m.allOvernight, false);
assert.equal(m.dependsOnOvernight, true);
assert.equal(m.intradayNet, -500);
ok("mixed case attributes the gain to the overnight leg");

console.log(`\n${n} checks passed (total)`);
