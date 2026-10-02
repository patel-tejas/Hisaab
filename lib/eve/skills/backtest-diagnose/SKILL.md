---
name: backtest-diagnose
description: >-
  Diagnose a backtest that produced no trades, too few trades, or a suspicious
  result, and say what to change. Trigger keywords: no trades, zero trades, no
  signals, nothing happened, why did it lose, too few trades, suspicious,
  result looks wrong, broken.
category: tool
---

# Diagnosing a backtest

Adapted from the `backtest-diagnose` skill in Vibe-Trading (HKUDS, MIT). Its
error taxonomy is kept; everything about editing `signal_engine.py` is dropped —
this engine is fixed and you cannot change its code. Diagnosis here means
adjusting the seven available parameters or explaining a data limit.

## Workflow

1. Check the signal counts first with `generate_signal`. Signals and execution
   are separate stages, and knowing which one is empty halves the search.
2. If signals exist but trades do not, the problem is execution or the window.
3. Classify with the taxonomy below.
4. Say what to change, concretely: name the parameter and the value.

## Zero or too few trades

| Symptom | Likely cause | What to change |
|---|---|---|
| `counts` are 0 BUY / 0 SELL | The angle gate rejects every crossover | Lower `angle_threshold` (try 20), or `signal_mode: "crossover"` to switch the gate off entirely |
| Signals exist, 0 trades | Every signal repeated the open direction; same-direction signals while open are ignored | Nothing to fix — explain it. A run of BUYs produces one trade |
| 1-5 trades | Normal for 15m on one month | Say the result is directional, not decisive. A faster timeframe gives more trades |
| Fewer bars than expected | Seed window: the first `slow_ema - 1` bars are always HOLD | Expected with a large `slow_ema` on a short month |

A very high `slow_ema` on 15m is the most common cause of an empty result: 2026-08
has only 208 bars at 15m, so a 60-bar slow EMA consumes a third of the month
before the first signal can fire.

## Results that look wrong

| Symptom | Cause | What to say |
|---|---|---|
| One trade dominates the total | It was force-closed at the end of the data (`closed_at_end`), or held across sessions | The result is an artifact of the window, not an edge. Say so plainly |
| Profitable but every trade is multi-day | No end-of-day square-off is applied | The P&L includes overnight gap exposure an intraday strategy would not carry |
| Costs look small relative to P&L | The engine still sizes at lot 50, not the real 65 | See the `futures-backtesting` skill's discrepancy section |
| 1m much worse than 15m | 1m is the most cost-sensitive timeframe | Expected: more trades, same ~Rs 425 per round trip |

## Errors from the engine

The bridge returns `{"error": "..."}` with an actionable message. Surface the
message; do not paraphrase it into something vaguer.

| Error | Meaning | Response |
|---|---|---|
| `processed candles not found` | That month/timeframe is not on disk | List what is available with `list_research_months` |
| `ValueError: limit must be 1..200` | A preview cap | Internal — the interface paginates |
| exceeded 300s | A grid on 1m | Retry on 15m or narrow the grid |
| `offset N beyond M bars` | Reading past the end | Internal |

## Do not do these

- Do not retry the same grid hoping for a different answer. The engine is
  deterministic: identical inputs give an identical result.
- Do not widen the search until something looks profitable. That is the
  behaviour `validate_parameter_search` exists to catch.
- Do not attribute a loss to "market conditions" without a regime result to
  point at.
- Do not invent a fix you cannot apply. If the limit is the data or the engine,
  say that is the limit.

## Suggesting next steps

Be specific about parameter and value:

- "Lower the steepness threshold from 30° to 20° — the gate is rejecting all
  five crossovers."
- "Try 5m instead of 15m; 15m gave only 9 signals in this month."
- "Switch to crossover-only to see how much the angle gate is actually filtering."

Offer at most two or three, and say what each one would tell them.
