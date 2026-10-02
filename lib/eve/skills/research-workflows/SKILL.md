---
name: research-workflows
description: >-
  Advanced research: parameter grids, train/validation/test splits,
  walk-forward validation, regime analysis, multiple-testing corrections and
  how to answer "will this strategy actually work?". Trigger keywords:
  parameter search, grid search, walk-forward, out-of-sample, overfitting,
  credible, deflated sharpe, PBO, tune, optimize.
category: research
---

# Research workflows

## Golden rule: calibration never touches test data

- **Training** = first 23 days of the month (default train split).
- **Validation** = days 24-27. **Test** = days 28-31.
- `parameter_search` runs on the **training window only**. Its top net P&L is
  in-sample; never present it as expected performance.

## Answering "will this strategy work?"

This is the question the product exists to answer. Pick the right tool:

| Situation | Tool | Headline field |
|---|---|---|
| User supplied ONE config | `backtest_significance` | `sharpe_ci.excludes_zero` |
| Params came from a search | `validate_parameter_search` | **`credible`** |
| Want out-of-sample evidence | `walk_forward_test` | `summary.oos_positive_steps` |

**`validate_parameter_search` is the one to reach for by default.**
`parameter_search` returns the best of ~320 combinations, and the maximum of 320
draws is comfortably positive even when every combination is worthless - so that
number alone is not evidence of an edge. `validate_parameter_search` runs the
same grid and adds the corrections: deflated Sharpe (against the Sharpe the best
of N reaches by luck), a bootstrap Sharpe interval, a permutation test, and PBO
(does the *selection procedure* generalise?).

`credible` is true only when the deflated Sharpe, the bootstrap interval and PBO
all come back favourable.

**`credible: false` is the normal outcome on one or two months of data.** Report
it plainly as "this did not survive the checks" - it is a finding, not an error,
and not a reason to go hunting for a config that passes. Never describe a raw
`parameter_search` winner as "the best parameters" without saying it is
uncorrected.

Window difference worth stating: `parameter_search` calibrates on the train
split only; `validate_parameter_search` searches the **whole month** and lets
PBO do the generalisation test. So their "best params" can legitimately differ.

## Parameter search

- Default grid: fast EMA [5,7,9,12] x slow [15,18,21,25] x angle
  [20,25,30,35,40] x lookback [1,2,3,5] = 320 combos (fast < slow enforced).
- Result rows carry `RE-####` experiment IDs; sorted by net P&L.
- Summary stats to quote: `positive_share`, `median_net_pnl`, best combo.
- Prefer **15m** for exploration (the full grid takes ~3s). 1m on a full month
  is the slowest (1-2 min) - narrow the grid with the `fast_emas` /
  `slow_emas` / `angle_thresholds` / `angle_lookbacks` arguments.

## Walk-forward (the anti-overfitting check)

Three anchored steps (5-day test windows):

1. Train 1-15 -> Test 16-20
2. Train 1-20 -> Test 21-25
3. Train 1-25 -> Test 26-31

Each step: grid-search on train ONLY -> apply the best params to the unseen test
window -> record `test_net_pnl`. **Quote OOS numbers, not train numbers.**

Overfitting signals: train net >> OOS net, or the best combo flips between
walk-forward steps.

## Regime analysis

Regimes from realized daily range `(day_high - day_low) / day_close`:
**high** > 1.5% / **mid** 0.8-1.5% / **low** < 0.8%.

July 2026: 23 days -> 1 high / 8 mid / 14 low (a low-vol month). Trade results
are attributed by entry date.

## Sample-size honesty

Only **2026-07** and **2026-08** are processed. Two months of one instrument
cannot establish an edge, whatever the metrics say. State this limit whenever
you give a verdict - it bounds every answer more than any single statistic does.
