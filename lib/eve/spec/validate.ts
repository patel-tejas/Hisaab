/**
 * Instant, local checks on a spec: the form's live feedback, and a cheap
 * first pass in the chat tool before the engine is asked.
 *
 * Mirrors the structural validators in `schema.py` and the parameter checks
 * in `semantic.py`, with the same JSON-Pointer paths. It is deliberately a
 * subset: the engine's `validate_strategy_spec` is the authority, and
 * anything this misses it will report.
 */

import type { Condition, Operand, SpecIssue, StrategySpec } from "./schema";
import { parseSpec, sidesOf } from "./schema";
import { INDICATORS, resolvedParams } from "./vocabulary";

function err(path: string, message: string, kind = "invalid"): SpecIssue {
  return { path, message, severity: "error", kind };
}
function warn(path: string, message: string, kind = "invalid"): SpecIssue {
  return { path, message, severity: "warning", kind };
}

function operandIssues(path: string, op: Operand): SpecIssue[] {
  if (op.kind !== "indicator") return [];
  const out: SpecIssue[] = [];
  const def = INDICATORS[op.name];
  for (const [key, value] of Object.entries(op.params)) {
    const p = def.params[key];
    if (!p) {
      out.push(
        err(
          `${path}/params/${key}`,
          `${op.name} has no parameter '${key}' (allowed: ${Object.keys(def.params).join(", ") || "none"})`,
          "unknown_reference",
        ),
      );
      continue;
    }
    if (p.type === "int" && !Number.isInteger(value))
      out.push(err(`${path}/params/${key}`, `${op.name}.${key} must be a whole number`));
    if (value < p.min || value > p.max)
      out.push(
        err(`${path}/params/${key}`, `${op.name}.${key} = ${value} is outside ${p.min}..${p.max}`, "out_of_range"),
      );
  }
  if (def.outputs) {
    if (op.output != null && !def.outputs.includes(op.output))
      out.push(err(`${path}/output`, `${op.name} output must be one of ${def.outputs.join(", ")}`, "unknown_reference"));
  } else if (op.output != null) {
    out.push(err(`${path}/output`, `${op.name} has a single output; set output to null`));
  }
  if (op.name === "macd") {
    const p = resolvedParams("macd", op.params);
    if (p.fast >= p.slow) out.push(err(`${path}/params/fast`, "MACD fast period must be shorter than slow"));
  }
  return out;
}

function conditionIssues(path: string, c: Condition): SpecIssue[] {
  const out: SpecIssue[] = [];
  if (c.cmp === "rising" || c.cmp === "falling") {
    if (c.rhs) out.push(err(`${path}/rhs`, `'${c.cmp}' compares lhs with its own past; drop rhs`));
  } else {
    if (!c.rhs) out.push(err(`${path}/rhs`, `'${c.cmp}' needs an rhs operand`));
    if (c.bars != null) out.push(err(`${path}/bars`, "'bars' is only used with rising/falling"));
  }
  if (c.lhs.kind === "const" && (!c.rhs || c.rhs.kind === "const"))
    out.push(err(path, "a condition needs at least one market operand, not only constants"));
  out.push(...operandIssues(`${path}/lhs`, c.lhs));
  if (c.rhs) out.push(...operandIssues(`${path}/rhs`, c.rhs));
  if (c.rhs && JSON.stringify(c.lhs) === JSON.stringify(c.rhs))
    out.push(err(path, "lhs and rhs are the same operand; this never changes"));
  return out;
}

/** Issues for an already-parsed spec, errors first. */
export function checkSpec(spec: StrategySpec): SpecIssue[] {
  const out: SpecIssue[] = [];
  const sides = sidesOf(spec.direction);
  for (const side of ["long", "short"] as const) {
    const wanted = sides.includes(side);
    const entry = spec.entry[side];
    const exit = spec.exit[side];
    const has = (g: typeof entry) => !!g && (g.all.length > 0 || g.any.length > 0);
    if (wanted && !has(entry))
      out.push(err(`/entry/${side}`, `direction is '${spec.direction}' but entry.${side} has no conditions`));
    if (!wanted && has(entry))
      out.push(err(`/entry/${side}`, `direction is '${spec.direction}' but entry.${side} has conditions`));
    if (!wanted && has(exit))
      out.push(err(`/exit/${side}`, `direction is '${spec.direction}' but exit.${side} has conditions`));
    for (const block of ["entry", "exit"] as const) {
      const g = spec[block][side];
      if (!g) continue;
      for (const list of ["all", "any"] as const)
        g[list].forEach((c, i) => out.push(...conditionIssues(`/${block}/${side}/${list}/${i}`, c)));
    }
  }

  const r = spec.risk;
  for (const name of ["stop", "target", "trail"] as const) {
    const b = r[name];
    if (b.mode !== "none" && (b.value == null || b.value <= 0))
      out.push(err(`/risk/${name}/value`, `${name}.value must be > 0 when ${name}.mode is '${b.mode}'`));
  }
  if (r.target.mode === "r_multiple" && r.stop.mode === "none")
    out.push(err("/risk/target", "an r_multiple target needs a stop to measure R from"));
  if (r.stop.mode === "none") out.push(warn("/risk/stop", "no stop-loss: a single bad day is unbounded"));

  const s = spec.session;
  if (s.entry_end <= s.entry_start) out.push(err("/session/entry_end", "entry window ends before it starts"));
  if (s.entry_start < "09:15" || s.entry_end > "15:30")
    out.push(err("/session", "entries must fall inside the NSE session 09:15-15:30"));
  if (s.eod_squareoff && s.entry_end > s.squareoff_time)
    out.push(err("/session/entry_end", "entry window runs past the square-off time"));

  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
}

/** Parse then check. `spec` is null when the shape itself is wrong. */
export function localCheck(raw: unknown): { spec: StrategySpec | null; issues: SpecIssue[] } {
  const { spec, issues } = parseSpec(raw);
  if (!spec) return { spec, issues };
  return { spec, issues: checkSpec(spec) };
}

export function hasErrors(issues: SpecIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
