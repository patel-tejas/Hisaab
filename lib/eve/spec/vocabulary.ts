/**
 * The spec vocabulary: indicators with parameter bounds, levels, comparators.
 *
 * A static mirror of `public_vocabulary()` in
 * `quant/strategies/spec/vocabulary.py`, so the form renders without a
 * bridge round-trip. The engine still validates every spec, so if the two
 * ever drift the engine's answer wins and the form shows its error.
 */

import type { Comparator, IndicatorName } from "./schema";

export type ParamDef = {
  type: "int" | "float";
  min: number;
  max: number;
  default: number;
  description: string;
};

export type IndicatorDef = {
  name: IndicatorName;
  label: string;
  description: string;
  /** In display (and summary) order. */
  params: Record<string, ParamDef>;
  outputs: string[] | null;
  warmup: (p: Record<string, number>) => number;
};

const period = (min: number, max: number, def: number, description = "lookback in bars"): ParamDef => ({
  type: "int",
  min,
  max,
  default: def,
  description,
});

export const INDICATORS: Record<IndicatorName, IndicatorDef> = {
  ema: {
    name: "ema",
    label: "EMA",
    description: "Exponential moving average of the close.",
    params: { period: period(2, 400, 20) },
    outputs: null,
    warmup: (p) => p.period,
  },
  sma: {
    name: "sma",
    label: "SMA",
    description: "Simple moving average of the close.",
    params: { period: period(2, 400, 20) },
    outputs: null,
    warmup: (p) => p.period,
  },
  rsi: {
    name: "rsi",
    label: "RSI",
    description: "Wilder RSI, 0-100. Oversold < 30, overbought > 70 by convention.",
    params: { period: period(2, 100, 14) },
    outputs: null,
    warmup: (p) => p.period + 1,
  },
  macd: {
    name: "macd",
    label: "MACD",
    description: "MACD line, signal line and histogram (line - signal).",
    params: {
      fast: period(2, 100, 12, "fast EMA"),
      slow: period(3, 200, 26, "slow EMA"),
      signal: period(2, 50, 9, "signal EMA of the line"),
    },
    outputs: ["line", "signal", "hist"],
    warmup: (p) => p.slow + p.signal,
  },
  bbands: {
    name: "bbands",
    label: "Bollinger Bands",
    description: "SMA(period) +/- stddev x population standard deviation.",
    params: {
      period: period(2, 200, 20),
      stddev: { type: "float", min: 0.5, max: 5, default: 2, description: "band width in standard deviations" },
    },
    outputs: ["upper", "mid", "lower"],
    warmup: (p) => p.period,
  },
  atr: {
    name: "atr",
    label: "ATR",
    description: "Wilder average true range, in points.",
    params: { period: period(2, 100, 14) },
    outputs: null,
    warmup: (p) => p.period + 1,
  },
  ema_angle: {
    name: "ema_angle",
    label: "EMA angle",
    description: "Steepness of an EMA in degrees. Positive = rising; 30 is the house threshold.",
    params: {
      period: period(2, 400, 9, "EMA period"),
      lookback: period(1, 20, 1, "bars used for the slope"),
    },
    outputs: null,
    warmup: (p) => p.period + p.lookback,
  },
};

export function resolvedParams(name: IndicatorName, given: Record<string, number> = {}): Record<string, number> {
  const def = INDICATORS[name];
  const out: Record<string, number> = {};
  for (const [key, p] of Object.entries(def.params)) {
    const v = key in given ? given[key] : p.default;
    out[key] = p.type === "int" ? Math.trunc(v) : v;
  }
  return out;
}

export const PRICE_FIELD_LABELS: Record<string, string> = {
  open: "Open",
  high: "High",
  low: "Low",
  close: "Close",
  volume: "Volume",
};

export const LEVEL_LABELS: Record<string, string> = {
  prev_day_high: "Yesterday's high",
  prev_day_low: "Yesterday's low",
  prev_day_close: "Yesterday's close",
  session_open: "Today's open",
  session_high: "Today's high so far",
  session_low: "Today's low so far",
  vwap: "VWAP (session)",
};

export const CHANGE_REF_LABELS: Record<string, string> = {
  prev_day_close: "vs yesterday's close",
  session_open: "vs today's open",
  prev_bar_close: "vs previous bar",
};

export const COMPARATOR_LABELS: Record<Comparator, string> = {
  gt: "is above",
  gte: "is at or above",
  lt: "is below",
  lte: "is at or below",
  crosses_above: "crosses above",
  crosses_below: "crosses below",
  rising: "is rising",
  falling: "is falling",
};

export const OPERAND_KIND_LABELS = {
  indicator: "Indicator",
  price: "Price",
  level: "Level",
  const: "Number",
  change_pct: "% change",
} as const;

export const TIMEFRAME_LABELS = { "1m": "1 minute", "5m": "5 minutes", "15m": "15 minutes" } as const;
export const DIRECTION_LABELS = {
  long_only: "Long only",
  short_only: "Short only",
  both: "Long and short",
} as const;
