/**
 * The strategy envelope: the only configuration the quant engine can test.
 *
 * Shared by the server (`propose_strategy`'s schema) and the client (the
 * Strategy Card and sliders), so the bounds the model is given and the bounds
 * the UI enforces cannot disagree.
 *
 * Pure module — no `node:` imports — so client components can use it.
 */

export const SIGNAL_MODES = [
  "crossover",
  "crossover_and_angle",
  "crossover_angle_and_trend",
] as const;
export type SignalMode = (typeof SIGNAL_MODES)[number];

export const TIMEFRAMES = ["1m", "5m", "15m"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const SLIPPAGE_MODES = ["ideal", "normal", "stress"] as const;
export type SlippageMode = (typeof SLIPPAGE_MODES)[number];

export type StrategyParams = {
  fast_ema: number;
  slow_ema: number;
  angle_threshold: number;
  angle_lookback: number;
  signal_mode: SignalMode;
  month: string;
  timeframe: Timeframe;
  slippage: SlippageMode;
};

/** Phase-04 engine defaults. Identical to the Python `StrategyConfig`. */
export const DEFAULT_PARAMS: Omit<StrategyParams, "month"> = {
  fast_ema: 9,
  slow_ema: 15,
  angle_threshold: 30,
  angle_lookback: 1,
  signal_mode: "crossover_and_angle",
  timeframe: "15m",
  slippage: "normal",
};

/**
 * Slider bounds, widened slightly around the default research grid
 * (`fast [5,7,9,12]`, `slow [15,18,21,25]`, `angle [20..40]`,
 * `lookback [1,2,3,5]`) so a user can explore just past it.
 */
export const PARAM_BOUNDS = {
  fast_ema: { min: 3, max: 30, step: 1 },
  slow_ema: { min: 5, max: 60, step: 1 },
  angle_threshold: { min: 0, max: 60, step: 0.5 },
  angle_lookback: { min: 1, max: 10, step: 1 },
} as const;

export type NumericParam = keyof typeof PARAM_BOUNDS;

/** What each knob means, in the user's language. */
export const PARAM_META: Record<
  NumericParam,
  { label: string; hint: string; unit?: string }
> = {
  fast_ema: {
    label: "Fast average",
    hint: "The quicker moving average. Lower reacts sooner but whipsaws more.",
    unit: "bars",
  },
  slow_ema: {
    label: "Slow average",
    hint: "The baseline it crosses. Must stay above the fast average.",
    unit: "bars",
  },
  angle_threshold: {
    label: "Minimum steepness",
    hint: "How sharply the fast average must be rising or falling to count. Higher means fewer, more decisive trades.",
    unit: "°",
  },
  angle_lookback: {
    label: "Steepness window",
    hint: "How many bars the slope is measured over. Higher smooths the angle.",
    unit: "bars",
  },
};

export const SIGNAL_MODE_META: Record<SignalMode, { label: string; hint: string }> = {
  crossover: {
    label: "Crossover only",
    hint: "Variant A — every crossover trades, ignoring steepness. Most signals, worst cost drag.",
  },
  crossover_and_angle: {
    label: "Crossover + steepness",
    hint: "Variant B — the default. A crossover only trades if the move is steep enough.",
  },
  crossover_angle_and_trend: {
    label: "Crossover + steepness + trend",
    hint: "Variant C — B, plus price must already be above the slow average to buy.",
  },
};

const SLIPPAGE_WORDS: Record<SlippageMode, string> = {
  ideal: "no slippage",
  normal: "1 tick of slippage",
  stress: "3 ticks of slippage",
};

/**
 * Explain a config in plain English.
 *
 * A template over the current params, deliberately not model prose: it is
 * string interpolation rather than computation, so it re-renders with the
 * sliders and can never describe a config the panel no longer shows.
 */
export function describeStrategy(p: StrategyParams): string {
  const gate =
    p.signal_mode === "crossover"
      ? ""
      : ` while rising at ${p.angle_threshold}° or steeper (measured over ${
          p.angle_lookback === 1 ? "1 bar" : `${p.angle_lookback} bars`
        })`;
  const trend =
    p.signal_mode === "crossover_angle_and_trend"
      ? ", and only when price is already above the slow average"
      : "";

  return (
    `Buy when the ${p.fast_ema}-bar average crosses above the ${p.slow_ema}-bar ` +
    `average${gate}${trend}. Sell on the mirror image. ` +
    `Tested on ${p.timeframe} candles for ${p.month}, with orders filling at the ` +
    `next candle's open plus ${SLIPPAGE_WORDS[p.slippage]}.`
  );
}

/** Clamp + repair a config so `fast_ema < slow_ema` always holds. */
export function normalizeParams(p: StrategyParams): StrategyParams {
  const clamp = (k: NumericParam, v: number) =>
    Math.min(PARAM_BOUNDS[k].max, Math.max(PARAM_BOUNDS[k].min, v));

  const fast = clamp("fast_ema", Math.trunc(p.fast_ema));
  let slow = clamp("slow_ema", Math.trunc(p.slow_ema));
  if (slow <= fast) slow = Math.min(PARAM_BOUNDS.slow_ema.max, fast + 1);

  return {
    ...p,
    fast_ema: fast,
    slow_ema: slow,
    angle_threshold: clamp("angle_threshold", p.angle_threshold),
    angle_lookback: clamp("angle_lookback", Math.trunc(p.angle_lookback)),
  };
}

/** The strategy arguments the bridge's backtest tools accept. */
export function toBridgeArgs(p: StrategyParams) {
  return {
    month: p.month,
    timeframe: p.timeframe,
    fast_ema: p.fast_ema,
    slow_ema: p.slow_ema,
    angle_threshold: p.angle_threshold,
    angle_lookback: p.angle_lookback,
    signal_mode: p.signal_mode,
    slippage: p.slippage,
  };
}

/** Metrics block returned by `run_backtest_signals`. */
export type BacktestMetrics = {
  total_trades: number | null;
  win_rate: number | null;
  gross_pnl: number | null;
  net_pnl: number | null;
  profit_factor: number | null;
  avg_trade_pnl: number | null;
  avg_holding_periods: number | null;
  max_drawdown_pct: number | null;
  max_drawdown_duration_bars: number | null;
  sharpe: number | null;
  sortino: number | null;
  calmar: number | null;
  trading_days: number | null;
};

export type Trade = {
  trade_id: number;
  entry_time: string;
  exit_time: string;
  direction: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  gross_pnl: number;
  costs: number;
  net_pnl: number;
};

export type BacktestResult = {
  month: string;
  timeframe: string;
  config: Record<string, unknown>;
  slippage: string;
  metrics: BacktestMetrics;
  equity: { start: number; end: number; bars: number };
  trades?: Trade[];
};
