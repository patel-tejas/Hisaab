/**
 * Checks for the TypeScript copy of the eve.strategy/1 spec. No test runner:
 *   npm run verify:spec
 * compiles this file with tsc (tsconfig.verify.json) and runs it with node.
 *
 * The golden fixture (scripts/fixtures/strategy-spec-golden.json) was produced
 * by the Python engine (quant/strategies/spec) from the same specs; if the
 * engine's wording or checks change, regenerate it and this catches the drift.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  checkSpec,
  describeSpec,
  fmtG,
  localCheck,
  parseSpec,
  starterSpec,
  strategySpecJsonSchema,
} from "../lib/eve/spec"

let n = 0
const ok = (label: string) => {
  n++
  console.log(`  ok  ${label}`)
}

type Golden = Record<string, { spec: unknown; summary: string | null; errors: string[]; warnings: string[] }>
const golden = JSON.parse(
  readFileSync(join(process.cwd(), "scripts/fixtures/strategy-spec-golden.json"), "utf8"),
) as Golden

// ── Python's :g number format ────────────────────────────────────────────────
{
  assert.equal(fmtG(2), "2")
  assert.equal(fmtG(2.5), "2.5")
  assert.equal(fmtG(-0.75), "-0.75")
  assert.equal(fmtG(24350.55), "24350.5")
  assert.equal(fmtG(1_000_000), "1e+06")
  assert.equal(fmtG(0.00001), "1e-05")
  ok("formats numbers like Python's :g")
}

// ── Summaries match the engine word for word ────────────────────────────────
for (const [name, g] of Object.entries(golden)) {
  if (g.summary === null) continue
  const { spec, issues } = parseSpec(g.spec)
  assert.ok(spec, `${name}: should parse, got ${JSON.stringify(issues)}`)
  assert.equal(describeSpec(spec!), g.summary)
  ok(`summary of "${name}" matches the engine`)
}

// ── Local checks agree with the engine on errors ────────────────────────────
for (const [name, g] of Object.entries(golden)) {
  const { issues } = localCheck(g.spec)
  const errs = issues.filter((i) => i.severity === "error").map((i) => i.path).sort()
  assert.deepEqual(errs, [...g.errors].sort(), `${name}: error paths`)
  // Local warnings are a subset of the engine's.
  for (const w of issues.filter((i) => i.severity === "warning")) {
    assert.ok(g.warnings.includes(w.path), `${name}: unexpected local warning ${w.path}`)
  }
  ok(`local errors for "${name}" match the engine (${errs.length})`)
}

// ── Structure ───────────────────────────────────────────────────────────────
{
  const s = starterSpec()
  assert.deepEqual(checkSpec(s).filter((i) => i.severity === "error"), [])
  ok("the form's starter spec is valid")

  const unknown = parseSpec({ ...s, entry: { long: { all: [{ lhs: { kind: "indicator", name: "stochastic" }, cmp: "gt", rhs: { kind: "const", value: 1 } }] } } })
  assert.equal(unknown.spec, null)
  assert.ok(unknown.issues.some((i) => i.path.startsWith("/entry/long/all/0/lhs")))
  ok("an indicator outside the vocabulary is rejected with a JSON Pointer")

  const extra = parseSpec({ ...s, leverage: 10 })
  assert.equal(extra.spec, null)
  ok("unknown top-level fields are rejected, as the engine does")

  const lookahead = parseSpec({
    ...s,
    entry: { long: { all: [{ lhs: { kind: "price", field: "close", offset: -1 }, cmp: "gt", rhs: { kind: "const", value: 1 } }] } },
  })
  assert.equal(lookahead.spec, null)
  ok("a negative offset (look-ahead) cannot be expressed")

  const noSides = localCheck({ ...s, direction: "short_only" })
  assert.ok(noSides.issues.some((i) => i.path === "/entry/short" && i.severity === "error"))
  assert.ok(noSides.issues.some((i) => i.path === "/entry/long" && i.severity === "error"))
  ok("direction and entry sides must agree")

  const rTarget = localCheck({ ...s, risk: { ...s.risk, stop: { mode: "none", value: null } } })
  assert.ok(rTarget.issues.some((i) => i.path === "/risk/target" && i.severity === "error"))
  ok("an R-multiple target without a stop is an error")
}

// ── The chat tool's schema stays small ──────────────────────────────────────
{
  const size = JSON.stringify(strategySpecJsonSchema()).length
  assert.ok(size < 12_000, `spec JSON Schema is ${size} bytes`)
  ok(`spec JSON Schema for the chat tool is ${size} bytes`)

  const schema = strategySpecJsonSchema() as { $defs?: Record<string, unknown> }
  const refs = JSON.stringify(schema).match(/"\$ref":"[^"]+"/g) ?? []
  assert.ok(refs.length > 0)
  for (const r of refs) {
    const name = r.slice(8, -1).replace("#/$defs/", "")
    assert.ok(schema.$defs && name in schema.$defs, `unresolved ${r}`)
  }
  assert.ok(schema.$defs && "Operand" in schema.$defs && "Condition" in schema.$defs)
  ok("every $ref in the spec schema resolves to a named $def")
}

console.log(`\n${n} checks passed`)
