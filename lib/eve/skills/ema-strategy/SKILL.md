---
name: ema-strategy
description: >-
  The EMA 9/15 + angle strategy: signal rules, the five tunable parameters,
  no-look-ahead guarantees, and the A/B/C variant definitions. Use when
  translating a user's plain-English strategy into generate_signal or
  run_backtest_signals parameters, or when explaining what a config does.
category: strategy
---

# EMA fast/slow + angle strategy

## Signal rules

- **BUY**: bullish crossover (fast EMA crosses above slow EMA) AND
  fast-EMA angle >= threshold (+30 deg default)
- **SELL**: bearish crossover (fast EMA crosses below slow EMA) AND
  fast-EMA angle <= -threshold (-30 deg default)
- Anything else: **HOLD**

## Plain-English translation

This is the only strategy family the engine can test. Map a user's words onto
the parameters below; anything that cannot be expressed in them is
**unsupported** and must be named back to the user explicitly.

| User says | Maps to |
|---|---|
| "9 and 21 moving averages", "9/21 crossover" | `fast_ema 9`, `slow_ema 21` |
| "steeply", "sharp move", "strong trend" | raise `angle_threshold` (35-40) |
| "any crossover", "ignore the slope" | `signal_mode "crossover"` |
| "only with the trend", "above the average" | `signal_mode "crossover_angle_and_trend"` |
| "smoother slope", "less noisy angle" | raise `angle_lookback` (2-5) |
| "on 5-minute candles" | `timeframe "5m"` |
| "assume worse fills", "be pessimistic" | `slippage "stress"` |

**Not expressible - say so plainly and offer the nearest EMA test:** RSI, MACD,
Bollinger bands, stochastics, volume filters, stop-losses, targets, trailing
stops, position sizing, multiple instruments, options, intraday time windows.

## Parameters (StrategyConfig)

| Field | Default | Notes |
|---|---|---|
| `fast_ema` | 9 | must be < `slow_ema` |
| `slow_ema` | 15 | |
| `angle_threshold` | 30.0 | degrees; applies to both sides |
| `angle_lookback` | 1 | bars used for slope |
| `signal_mode` | `crossover_and_angle` | see variants |

## Variants

- **A** = `crossover` - angle gate off. Most signals, worst cost drag.
- **B** = `crossover_and_angle` - the default strategy.
- **C** = `crossover_angle_and_trend` - B plus "close above slow EMA" for BUY.

## Signal engine contract

- Indicators are recomputed by the engine from OHLCV - never trust indicator
  columns in inputs.
- Deterministic: same candles + same config -> identical output.
- No look-ahead: at bar `t` only bars `<= t` are used. Crossover uses `t-1`;
  angle uses close of `t`.
- Seed window: the first `slow_ema - 1` bars carry no slow EMA and are always
  HOLD.

## Signal output columns

`timestamp, signal_type (BUY/SELL/HOLD), crossover, ema_fast, ema_slow, angle,
candle_close` - one row per bar, HOLD rows included.

## Signal counts (July 2026, B config)

Non-HOLD counts: 1m -> 3 BUY / 6 SELL; 5m -> 6/5; 15m -> 5/4.

B == C on July because the trend filter never discriminated (price stayed above
the slow EMA for all eligible crosses). The angle gate cuts most A-variant
trades.

These are **signal** counts and are unaffected by the execution corrections
described in `futures-backtesting`. Signal generation has not changed.
