---
name: strategy-builder
description: >-
  How to turn a trader's words into an eve.strategy/1 spec: mapping common
  phrases to operands and comparators, what to default, what cannot be
  expressed, and how saving, versions and trials work. Trigger keywords: build
  a strategy, my own strategy, RSI, MACD, Bollinger, VWAP, breakout, stop
  loss, target, trailing stop, save it, change it, version.
category: workflow
---

# Building a strategy spec

## Phrase to spec

| The trader says | Condition |
| --- | --- |
| "9 EMA crosses above 21 EMA" | `ema(9) crosses_above ema(21)` |
| "price above the 200 EMA" | `price close gt ema(200)` |
| "RSI below 30" / "oversold" | `rsi(14) lt const 30` |
| "MACD crosses its signal" | `macd output line crosses_above macd output signal` |
| "MACD histogram positive" | `macd output hist gt const 0` |
| "close below the lower band" | `price close lt bbands output lower` |
| "breaks yesterday's high" | `price close crosses_above level prev_day_high` |
| "above VWAP" | `price close gt level vwap` |
| "down 1% on the day" | `change_pct ref prev_day_close lte const -1` |
| "EMA is rising" | `ema(20) rising bars 1` |
| "steep 9 EMA" | `ema_angle(9) gt const 30` |
| "the previous candle closed above" | add `offset: 1` to the operand |

Use `all` for "and", `any` for "or". Up to 8 conditions in each.

## Defaults to state

When the trader does not say, use these and list each JSON Pointer in
`meta.defaulted`: timeframe 15m; long_only unless they mention shorting;
entry window 09:30 to 14:30; square-off 15:15; stop 1% (`/risk/stop`);
1 lot; normal slippage. A target is optional: add one only when they talk
about taking profit, and mark it.

## Exits

A position closes on the first of: an exit condition, the stop, the target,
the trailing stop, the time stop, the square-off. In a `both` spec the
opposite entry also closes the position; it never reverses in one step.
An `r_multiple` target needs a stop to measure R from.

## Cannot be expressed

Options, other instruments, more than one position, scaling in, order-book
or news data, conditions on a second timeframe, custom formulas. Put these
in `unsupported` and say so plainly.

## Saving and versions

Save only when asked. Saving the same rules twice returns the existing
strategy. Changing a saved strategy makes a new version; earlier versions
stay. Every new version and every recorded backtest counts as a trial, and
the trial count travels with every result: a good number found on the
twentieth try is weak evidence.
