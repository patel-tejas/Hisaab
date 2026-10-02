/**
 * What is wrong with a backtest result, derived from its own trade records.
 *
 * The bridge's `_backtest_config()` passes neither a `MarketContext` nor an
 * `ExitConfig`, so every live result uses `lot_size 50` / `tick_size ₹0.05`
 * (the real NIFTY contract is 65 / ₹0.10) and has no end-of-day square-off.
 * See `data/results/STALE.md` in the EMA_Strategy repo.
 *
 * That is not a caption-sized problem. On July 2026 15m it is the difference
 * between "+₹5,737, profit factor 1.35, passes the decision rule" and a losing
 * strategy — so rather than a generic disclaimer, this reads the trades and
 * reports which ones the result actually depends on.
 *
 * Sums engine-computed `net_pnl` values for presentation. Nothing here derives
 * a P&L.
 */

import type { BacktestResult, Trade } from "@/lib/eve/strategy";

/** The real NIFTY futures contract for the available months. */
export const REAL_LOT_SIZE = 65;

export type IntegrityAnalysis = {
  /** Lot size the engine actually used, read off the trade records. */
  lotUsed: number | null;
  lotWrong: boolean;
  overnight: Trade[];
  intraday: Trade[];
  overnightNet: number;
  intradayNet: number;
  total: number;
  /** Every trade crossed a session boundary. */
  allOvernight: boolean;
  /** The headline is positive only because of positions held overnight. */
  dependsOnOvernight: boolean;
  /** Nothing to warn about. */
  clean: boolean;
};

const sessionOf = (iso: string) => iso.slice(0, 10);

export function analyzeIntegrity(result: BacktestResult): IntegrityAnalysis | null {
  const trades = result.trades ?? [];
  if (trades.length === 0) return null;

  const overnight = trades.filter((t) => sessionOf(t.exit_time) !== sessionOf(t.entry_time));
  const overnightIds = new Set(overnight.map((t) => t.trade_id));
  const intraday = trades.filter((t) => !overnightIds.has(t.trade_id));

  const overnightNet = overnight.reduce((a, t) => a + t.net_pnl, 0);
  const intradayNet = intraday.reduce((a, t) => a + t.net_pnl, 0);
  const total = overnightNet + intradayNet;

  const lotUsed = trades[0]?.quantity ?? null;
  const lotWrong = lotUsed !== null && lotUsed !== REAL_LOT_SIZE;

  return {
    lotUsed,
    lotWrong,
    overnight,
    intraday,
    overnightNet,
    intradayNet,
    total,
    allOvernight: overnight.length === trades.length,
    // A positive headline that survives only because of overnight exposure.
    // When every trade is overnight, the whole result is that exposure.
    dependsOnOvernight: total > 0 && overnight.length > 0 && intradayNet <= 0,
    clean: !lotWrong && overnight.length === 0,
  };
}
