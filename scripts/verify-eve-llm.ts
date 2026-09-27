/**
 * One real Groq turn through the real tool loop.
 *
 * This is the only way to cover three things unit tests cannot: whether zod
 * 3.25 schemas convert correctly under `ai@7`, whether the configured
 * `EVE_MODEL` is still a valid Groq id, and whether the model actually obeys
 * the propose-then-stop contract instead of running a backtest itself.
 *
 * It imports the same `systemPrompt()` and tool set the route uses — it does
 * not bypass or re-implement anything. The route's auth gate stays untouched.
 *
 *   npx tsx scripts/verify-eve-llm.ts
 */

import { readFileSync } from "node:fs";
import { createGroq } from "@ai-sdk/groq";
import { generateText, stepCountIs } from "ai";

import { buildTools, fetchManifest } from "../lib/eve/bridge";
import { systemPrompt } from "../lib/eve/prompt";
import { hisaabTools } from "../lib/eve/tools";
import type { ProposeStrategyOutput } from "../lib/eve/tools";

// tsx does not load .env, and this script is deliberately outside Next.
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const model = process.env.EVE_MODEL || "llama-3.3-70b-versatile";

let failures = 0;
const pass = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => {
  failures++;
  console.log(`  FAIL  ${m}`);
};

async function turn(prompt: string) {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
  const tools = { ...buildTools(await fetchManifest()), ...hisaabTools() };

  const res = await generateText({
    model: groq(model),
    system: systemPrompt(),
    prompt,
    tools,
    stopWhen: stepCountIs(12),
    temperature: 0.2,
  });

  const calls = res.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName));
  const proposal = res.steps
    .flatMap((s) => s.toolResults)
    .find((r) => r.toolName === "propose_strategy")?.output as
    | ProposeStrategyOutput
    | undefined;

  return { calls, proposal, text: res.text };
}

async function main() {
  console.log(`model: ${model}`);
  const manifest = await fetchManifest();
  const tools = { ...buildTools(manifest), ...hisaabTools() };
  console.log(`tools: ${Object.keys(tools).length} (${manifest.length} from bridge + 2 local)\n`);

  if (Object.keys(tools).some((t) => t.includes("download_month") || t.includes("process_month"))) {
    fail("a write tool reached the model's tool set");
  } else {
    pass("no write tools in the model's tool set");
  }

  // --- 1. a strategy the engine CAN test ---------------------------------
  console.log("\n[1] \"9 EMA crosses above the 21, rising steeply, 15m July\"");
  const a = await turn(
    "Buy when the 9 EMA crosses above the 21 EMA and it's rising steeply. Test it on 15m candles for July 2026.",
  );
  console.log(`      tool calls: ${a.calls.join(", ") || "(none)"}`);

  if (!a.proposal) {
    fail("no propose_strategy call — the main workflow did not fire");
  } else {
    pass("propose_strategy called");
    const p = a.proposal.params;
    console.log(`      params: fast ${p.fast_ema} / slow ${p.slow_ema} / angle ${p.angle_threshold} / ${p.timeframe} / ${p.month}`);
    p.slow_ema === 21
      ? pass("slow_ema = 21 (read from the request, not left at the default 15)")
      : fail(`slow_ema = ${p.slow_ema}, expected 21`);
    p.fast_ema === 9 ? pass("fast_ema = 9") : fail(`fast_ema = ${p.fast_ema}, expected 9`);
    p.timeframe === "15m" ? pass("timeframe = 15m") : fail(`timeframe = ${p.timeframe}`);
    p.month === "2026-07" ? pass("month = 2026-07") : fail(`month = ${p.month}`);
    a.proposal.unsupported.length === 0
      ? pass("unsupported is empty — this request fits the engine")
      : fail(`unsupported unexpectedly lists: ${a.proposal.unsupported.join(", ")}`);
  }

  // The contract: propose and stop. The UI runs the backtest on the
  // deterministic path, so a backtest here means numbers went through the model.
  const ranBacktest = a.calls.some((c) =>
    ["run_backtest_signals", "parameter_search", "validate_parameter_search"].includes(c),
  );
  ranBacktest
    ? fail(`model ran a backtest itself (${a.calls.join(", ")}) instead of proposing and stopping`)
    : pass("did not run a backtest itself — propose-then-stop honoured");

  // --- 2. a strategy the engine CANNOT test -----------------------------
  console.log('\n[2] "buy when RSI drops below 30"');
  const b = await turn("I want to buy when RSI drops below 30. Can you test that?");
  console.log(`      tool calls: ${b.calls.join(", ") || "(none)"}`);

  const mentionsRsi =
    b.proposal?.unsupported.some((u) => /rsi/i.test(u)) || /RSI/i.test(b.text);
  if (b.proposal) {
    b.proposal.unsupported.some((u) => /rsi/i.test(u))
      ? pass(`RSI named in unsupported: "${b.proposal.unsupported.join(", ")}"`)
      : fail(`proposed a config with unsupported = [${b.proposal.unsupported.join(", ")}] — RSI silently dropped`);
  } else if (mentionsRsi) {
    pass("declined in prose and named RSI (no config proposed)");
  } else {
    fail("neither proposed with unsupported nor explained the limit");
  }

  // --- 3. progressive disclosure over the skill corpus -------------------
  console.log('\n[3] "what slippage model do you use?"');
  const c = await turn("What slippage and cost model does the backtest use? Be specific.");
  console.log(`      tool calls: ${c.calls.join(", ") || "(none)"}`);
  c.calls.includes("load_skill")
    ? pass("load_skill called rather than answering from memory")
    : fail("answered without reading the skill");
  /Rs ?0?\.?10|0\.10|65|next candle/i.test(c.text)
    ? pass("answer cites the documented execution/contract facts")
    : fail(`answer did not cite the documented facts: ${c.text.slice(0, 200)}`);

  console.log(
    failures === 0
      ? "\nall LLM checks passed"
      : `\n${failures} LLM check(s) failed`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nharness error: ${err instanceof Error ? err.message : err}`);
  process.exit(2);
});
