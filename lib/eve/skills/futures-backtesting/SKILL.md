---
name: futures-backtesting
description: >-
  Backtest execution model, contract specs, costs and slippage, metric
  definitions, and how to interpret run_backtest_signals and
  compare_timeframes. Trigger keywords: backtest, slippage, costs, lot size,
  tick size, profit factor, drawdown, sharpe, next-candle, square-off.
category: backtest
---

# Futures backtesting

## Execution model

- Signals are decided at their bar's **close**; orders fill at the **next
  bar's open** plus adverse slippage. There is no intra-bar fill, ever.
- FLAT->BUY opens LONG, FLAT->SELL opens SHORT. Same-direction signals while
  open are ignored.
- A position still open at series end is closed at the last close and flagged
  `closed_at_end=1`. **Treat any result that depends on such a trade as an
  artifact of where the backtest stopped, not a finding** - see the warning
  below.

## Contract specs (NIFTY index futures)

| Spec | Real value | Source |
|---|---|---|
| Lot size | **65** contracts | `contract_metadata.json`, carried in the processed parquet's `lot_size` column |
| Tick size | **Rs 0.10** | stored as `10.0` in the `tick_size` column, which is **paise** |

## ⚠️ Known discrepancy in live numbers

The HTTP bridge's `_backtest_config()` does not yet pass a `MarketContext` or an
`ExitConfig`, so **every P&L figure it currently returns still uses the old
`lot_size=50` / `tick_size=0.05` defaults and has no end-of-day square-off.**

Consequences you must state when quoting a live number:

- Position sizing is understated by ~23% (50 vs 65 contracts).
- Slippage per tick is understated 2x (Rs 0.05 vs Rs 0.10).
- Positions are held **across days** and marked through overnight gaps, because
  a reverse signal is the only exit.

`data/results/STALE.md` documents the impact. The one profitable baseline cell
(B/C 15m, July 2026, net **+Rs 5,737**) rested on a single LONG held 7 calendar
days and force-closed at the month boundary. Re-run with lot 65, tick Rs 0.10
and `ExitConfig(eod_squareoff=...)`, the same signals give **8 trades, net
-Rs 11,308, profit factor 0.69**.

**Do not present +Rs 5,737 as a result.** When asked whether the strategy works,
say that the corrected run is negative and that it agrees with the statistical
verdict (deflated Sharpe 0.15, PBO 0.686): the apparent edge was a backtest
boundary condition.

## Slippage

`SlippageConfig.mode`: `ideal` (0 ticks), `normal` (1 tick adverse - the
default for research), `stress` (>=3 ticks), `ticks` (explicit entry/exit).

## Costs (per round trip, NIFTY futures)

Rates (unchanged by the lot-size correction):

- Brokerage: flat Rs 20 per order leg
- STT: 0.0125% on the sell leg only
- Exchange charge: 0.00345% both legs
- SEBI: 0.0001%; Stamp duty: 0.003% (buy); GST 18% on (brokerage + exchange)

At July 2026's mean 15m close (Rs 24,251):

| Lot | Notional per leg | Round-trip cost |
|---|---|---|
| 50 (what the bridge still uses) | Rs 12.13 lakh | **Rs 336** |
| 65 (real contract) | Rs 15.76 lakh | **Rs 423** |

Rule of thumb at the real lot size: **~Rs 425 per round trip**, so a net P&L
under about Rs 4,000 on fewer than 10 trades is inside the noise.

## End-of-day square-off

`ExitConfig.eod_squareoff` forces flat per session. The engine checks
`timestamp.time() >= eod_squareoff`, and bars are labelled by **interval
start**, so the value must be the *last bar's label*, not the 15:30 close:

| Timeframe | Bars/day | Last bar | Correct value |
|---|---|---|---|
| 1m | 375 | 15:29 | `"15:29"` |
| 5m | 75 | 15:25 | `"15:25"` |
| 15m | 25 | 15:15 | `"15:15"` |

A value of `"15:30"` would never match and the exit would silently never fire.

## Metrics glossary

| Metric | Meaning |
|---|---|
| `net_pnl` | gross - costs; the number to quote |
| `profit_factor` | gross P&L of winners / abs(gross P&L of losers) |
| `max_drawdown_pct` | % peak-to-trough on the equity curve |
| `sharpe`/`sortino` | annualized (252) from daily equity returns |
| `calmar` | annualized return / max drawdown |
| `trading_days` | unique days in the equity curve |

## Interpretation rules

- Costs and slippage are already inside every metric - never add them on.
- Project decision rule: net > 0 AND PF > 1.25 AND max drawdown < 10%.
- Fewer than ~20 trades in a month means "directional, not statistically
  decisive". Say so.
- 1m is the most active timeframe and the most cost-sensitive.
- Always state the month, timeframe and parameters a number came from. A number
  without its window is not a result.
