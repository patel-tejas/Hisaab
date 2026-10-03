/**
 * `eve.strategy/1` in TypeScript: the declarative strategy spec.
 *
 * Mirrors `quant/strategies/spec/schema.py` in Eve_Agentic_Trading. Python is
 * the source of truth: every spec is re-validated by the engine's
 * `validate_strategy_spec` before it is shown as runnable, saved or
 * backtested. This copy exists so the form can give instant feedback and the
 * chat tool can catch a malformed spec before paying for a bridge call.
 *
 * Uses zod v4 (`zod/v4`) for `toJSONSchema`; relative imports only, so
 * `scripts/verify-strategy-spec.ts` can compile it outside Next.
 */

import { z } from "zod/v4";

export const SCHEMA_VERSION = "eve.strategy/1" as const;

export const INDICATOR_NAMES = ["ema", "sma", "rsi", "macd", "bbands", "atr", "ema_angle"] as const;
export const PRICE_FIELDS = ["open", "high", "low", "close", "volume"] as const;
export const LEVEL_NAMES = [
  "prev_day_high",
  "prev_day_low",
  "prev_day_close",
  "session_open",
  "session_high",
  "session_low",
  "vwap",
] as const;
export const CHANGE_REFS = ["prev_day_close", "session_open", "prev_bar_close"] as const;
export const COMPARATORS = [
  "gt",
  "gte",
  "lt",
  "lte",
  "crosses_above",
  "crosses_below",
  "rising",
  "falling",
] as const;
export const TIMEFRAMES = ["1m", "5m", "15m"] as const;
export const DIRECTIONS = ["long_only", "short_only", "both"] as const;
export const STOP_MODES = ["none", "pct", "points", "atr"] as const;
export const TARGET_MODES = ["none", "pct", "points", "atr", "r_multiple"] as const;
export const TRAIL_MODES = ["none", "atr", "breakeven_then_atr"] as const;
export const SLIPPAGE = ["ideal", "normal", "stress"] as const;
export const SOURCES = ["chat", "form", "import"] as const;

export const MAX_OFFSET = 50;
export const MAX_CONDITIONS_PER_LIST = 8;
export const MAX_LOTS = 50;

const offset = z.number().int().min(0).max(MAX_OFFSET).default(0);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be HH:MM (24h)");

export const indicatorOperand = z
  .object({
    kind: z.literal("indicator"),
    name: z.enum(INDICATOR_NAMES),
    params: z.record(z.string(), z.number()).default({}),
    output: z.string().nullable().default(null),
    offset,
  })
  .strict();
export const priceOperand = z
  .object({ kind: z.literal("price"), field: z.enum(PRICE_FIELDS), offset })
  .strict();
export const levelOperand = z
  .object({ kind: z.literal("level"), name: z.enum(LEVEL_NAMES), offset })
  .strict();
export const constOperand = z.object({ kind: z.literal("const"), value: z.number() }).strict();
export const changePctOperand = z
  .object({ kind: z.literal("change_pct"), ref: z.enum(CHANGE_REFS), offset })
  .strict();

export const operand = z
  .discriminatedUnion("kind", [indicatorOperand, priceOperand, levelOperand, constOperand, changePctOperand])
  .meta({ id: "Operand" });

export const condition = z
  .object({
    lhs: operand,
    cmp: z.enum(COMPARATORS),
    rhs: operand.nullable().default(null),
    bars: z.number().int().min(1).max(MAX_OFFSET).nullable().default(null),
  })
  .strict()
  .meta({ id: "Condition" });

export const conditionGroup = z
  .object({
    all: z.array(condition).max(MAX_CONDITIONS_PER_LIST).default([]),
    any: z.array(condition).max(MAX_CONDITIONS_PER_LIST).default([]),
  })
  .strict()
  .meta({ id: "ConditionGroup" });

export const sideRules = z
  .object({
    long: conditionGroup.nullable().default(null),
    short: conditionGroup.nullable().default(null),
  })
  .strict();

const valueOrNull = z.number().nullable().default(null);

export const risk = z
  .object({
    stop: z.object({ mode: z.enum(STOP_MODES).default("none"), value: valueOrNull }).strict().default({ mode: "none", value: null }),
    target: z.object({ mode: z.enum(TARGET_MODES).default("none"), value: valueOrNull }).strict().default({ mode: "none", value: null }),
    trail: z.object({ mode: z.enum(TRAIL_MODES).default("none"), value: valueOrNull }).strict().default({ mode: "none", value: null }),
    time_stop_bars: z.number().int().min(1).max(500).nullable().default(null),
  })
  .strict();

export const session = z
  .object({
    entry_start: hhmm.default("09:15"),
    entry_end: hhmm.default("15:00"),
    eod_squareoff: z.boolean().default(true),
    squareoff_time: hhmm.default("15:15"),
  })
  .strict();

export const strategySpec = z
  .object({
    schema_version: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
    name: z.string().min(1).max(80),
    description: z.string().max(500).nullable().default(null),
    instrument: z
      .object({
        symbol: z.literal("NIFTY").default("NIFTY"),
        segment: z.literal("FUT").default("FUT"),
        contract: z.literal("near_month").default("near_month"),
      })
      .strict()
      .default({ symbol: "NIFTY", segment: "FUT", contract: "near_month" }),
    timeframe: z.enum(TIMEFRAMES).default("15m"),
    direction: z.enum(DIRECTIONS).default("long_only"),
    entry: sideRules,
    exit: sideRules.default({ long: null, short: null }),
    risk: risk.default({
      stop: { mode: "none", value: null },
      target: { mode: "none", value: null },
      trail: { mode: "none", value: null },
      time_stop_bars: null,
    }),
    session: session.default({
      entry_start: "09:15",
      entry_end: "15:00",
      eod_squareoff: true,
      squareoff_time: "15:15",
    }),
    sizing: z.object({ lots: z.number().int().min(1).max(MAX_LOTS).default(1) }).strict().default({ lots: 1 }),
    execution: z.object({ slippage: z.enum(SLIPPAGE).default("normal") }).strict().default({ slippage: "normal" }),
    meta: z
      .object({
        source: z.enum(SOURCES).default("form"),
        parent_version: z.number().int().nullable().default(null),
        defaulted: z.array(z.string()).max(40).default([]),
        user_prompt: z.string().max(2000).nullable().default(null),
      })
      .strict()
      .default({ source: "form", parent_version: null, defaulted: [], user_prompt: null }),
  })
  .strict();

export type IndicatorName = (typeof INDICATOR_NAMES)[number];
export type Comparator = (typeof COMPARATORS)[number];
export type Timeframe = (typeof TIMEFRAMES)[number];
export type Direction = (typeof DIRECTIONS)[number];
export type Operand = z.output<typeof operand>;
export type OperandKind = Operand["kind"];
export type Condition = z.output<typeof condition>;
export type ConditionGroup = z.output<typeof conditionGroup>;
export type SideRules = z.output<typeof sideRules>;
export type Risk = z.output<typeof risk>;
export type Session = z.output<typeof session>;
export type StrategySpec = z.output<typeof strategySpec>;

/** One problem with a spec, as the engine reports it: a JSON Pointer and a fix. */
export type SpecIssue = {
  path: string;
  message: string;
  severity: "error" | "warning";
  kind?: string;
};

/** `validate_strategy_spec`'s result, plus `source` saying who checked it. */
export type SpecAnalysis = {
  valid: boolean;
  errors: SpecIssue[];
  warnings: SpecIssue[];
  spec: StrategySpec | null;
  summary: string | null;
  spec_hash: string | null;
  defaulted: string[];
  warmup_bars: number | null;
};

export function sidesOf(direction: Direction): ("long" | "short")[] {
  return direction === "both" ? ["long", "short"] : direction === "long_only" ? ["long"] : ["short"];
}

/** zod issue path -> JSON Pointer, matching the engine's paths. */
export function toPointer(path: readonly PropertyKey[]): string {
  return path.length ? "/" + path.map((p) => String(p)).join("/") : "/";
}

/** Parse with zod; structural problems come back as issues, never thrown. */
export function parseSpec(raw: unknown): { spec: StrategySpec | null; issues: SpecIssue[] } {
  const res = strategySpec.safeParse(raw);
  if (res.success) return { spec: res.data, issues: [] };
  return {
    spec: null,
    issues: res.error.issues.map((i) => ({
      path: toPointer(i.path),
      message: i.message,
      severity: "error" as const,
      kind: "schema",
    })),
  };
}

/**
 * The spec's JSON Schema, for the chat tool. Built once; `$schema` dropped
 * because Groq's tool schemas don't need it. Shared parts (operands,
 * conditions) are `$ref`s into `$defs` so the schema stays ~6 KB; a caller
 * nesting it under a property must hoist `$defs` to its own root, since a
 * `$ref` resolves against the document root.
 */
let cachedJsonSchema: Record<string, unknown> | null = null;
export function strategySpecJsonSchema(): Record<string, unknown> {
  if (!cachedJsonSchema) {
    const { $schema: _drop, ...rest } = z.toJSONSchema(strategySpec, { io: "input", reused: "ref" }) as Record<
      string,
      unknown
    >;
    void _drop;
    cachedJsonSchema = rest;
  }
  return cachedJsonSchema;
}
