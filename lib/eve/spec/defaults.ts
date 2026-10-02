/** Starting points for the form: a blank spec and a sensible new condition. */

import type { Condition, ConditionGroup, Operand, StrategySpec } from "./schema";
import { SCHEMA_VERSION } from "./schema";

export function emptyGroup(): ConditionGroup {
  return { all: [], any: [] };
}

export function defaultOperand(kind: Operand["kind"]): Operand {
  switch (kind) {
    case "indicator":
      return { kind: "indicator", name: "ema", params: { period: 20 }, output: null, offset: 0 };
    case "price":
      return { kind: "price", field: "close", offset: 0 };
    case "level":
      return { kind: "level", name: "prev_day_high", offset: 0 };
    case "const":
      return { kind: "const", value: 0 };
    case "change_pct":
      return { kind: "change_pct", ref: "prev_day_close", offset: 0 };
  }
}

export function defaultCondition(): Condition {
  return {
    lhs: { kind: "price", field: "close", offset: 0 },
    cmp: "crosses_above",
    rhs: { kind: "indicator", name: "ema", params: { period: 20 }, output: null, offset: 0 },
    bars: null,
  };
}

/** The form's starting spec: a 20 EMA breakout with a 1% stop. */
export function starterSpec(): StrategySpec {
  return {
    schema_version: SCHEMA_VERSION,
    name: "My strategy",
    description: null,
    instrument: { symbol: "NIFTY", segment: "FUT", contract: "near_month" },
    timeframe: "15m",
    direction: "long_only",
    entry: { long: { all: [defaultCondition()], any: [] }, short: null },
    exit: {
      long: {
        all: [],
        any: [
          {
            lhs: { kind: "price", field: "close", offset: 0 },
            cmp: "crosses_below",
            rhs: { kind: "indicator", name: "ema", params: { period: 20 }, output: null, offset: 0 },
            bars: null,
          },
        ],
      },
      short: null,
    },
    risk: {
      stop: { mode: "pct", value: 1 },
      target: { mode: "r_multiple", value: 2 },
      trail: { mode: "none", value: null },
      time_stop_bars: null,
    },
    session: { entry_start: "09:30", entry_end: "14:30", eod_squareoff: true, squareoff_time: "15:15" },
    sizing: { lots: 1 },
    execution: { slippage: "normal" },
    meta: { source: "form", parent_version: null, defaulted: [], user_prompt: null },
  };
}
