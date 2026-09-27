/**
 * Metric labels, formatting and sentiment bands for backtest results.
 *
 * Banded thresholds adapted from `Vibe-Trading/frontend/src/lib/formatters.ts`
 * (HKUDS, MIT), with the i18n layer dropped. The equity helpers follow
 * `lib/tearsheet.ts` from the same project.
 */

import { formatInr, formatInrPlain } from "@/components/ai-insights/format";
import type { BacktestMetrics, Trade } from "@/lib/eve/strategy";

export type Sentiment = "pos" | "neg" | "warn" | "flat";

export const METRIC_LABELS: Record<keyof BacktestMetrics, string> = {
  total_trades: "Trades",
  win_rate: "Win rate",
  gross_pnl: "Gross P&L",
  net_pnl: "Net P&L",
  profit_factor: "Profit factor",
  avg_trade_pnl: "Avg per trade",
  avg_holding_periods: "Avg hold",
  max_drawdown_pct: "Max drawdown",
  max_drawdown_duration_bars: "Drawdown length",
  sharpe: "Sharpe",
  sortino: "Sortino",
  calmar: "Calmar",
  trading_days: "Trading days",
};

/** Order the KPI strip reads in — the decision rule's inputs first. */
export const KPI_ORDER: (keyof BacktestMetrics)[] = [
  "net_pnl",
  "profit_factor",
  "max_drawdown_pct",
  "total_trades",
  "win_rate",
  "sharpe",
];

const PCT_KEYS = new Set<keyof BacktestMetrics>(["win_rate", "max_drawdown_pct"]);
const INR_KEYS = new Set<keyof BacktestMetrics>(["gross_pnl", "net_pnl", "avg_trade_pnl"]);
const INT_KEYS = new Set<keyof BacktestMetrics>([
  "total_trades",
  "trading_days",
  "max_drawdown_duration_bars",
]);

export function formatMetric(key: keyof BacktestMetrics, value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (INR_KEYS.has(key)) return key === "net_pnl" ? formatInr(value) : formatInrPlain(value);
  if (PCT_KEYS.has(key)) {
    // The engine reports win_rate as a fraction and drawdown already as a
    // percent, so scale only the fraction.
    const pct = key === "win_rate" && Math.abs(value) <= 1 ? value * 100 : value;
    return `${pct.toFixed(1)}%`;
  }
  if (INT_KEYS.has(key)) return Math.round(value).toLocaleString("en-IN");
  if (key === "avg_holding_periods") return `${value.toFixed(1)} bars`;
  return value.toFixed(2);
}

/**
 * Sentiment for a metric.
 *
 * Thresholds come from the project's own decision rule (see the
 * `futures-backtesting` skill): net > 0 AND PF > 1.25 AND drawdown < 10%.
 */
export function metricSentiment(
  key: keyof BacktestMetrics,
  value: number | null,
): Sentiment {
  if (value === null || value === undefined || Number.isNaN(value)) return "flat";
  switch (key) {
    case "net_pnl":
    case "gross_pnl":
    case "avg_trade_pnl":
      return value > 0 ? "pos" : value < 0 ? "neg" : "flat";
    case "profit_factor":
      return value >= 1.25 ? "pos" : value >= 1 ? "warn" : "neg";
    case "max_drawdown_pct":
      return Math.abs(value) < 10 ? "pos" : Math.abs(value) < 20 ? "warn" : "neg";
    case "win_rate": {
      const pct = Math.abs(value) <= 1 ? value * 100 : value;
      return pct >= 50 ? "pos" : pct >= 40 ? "warn" : "neg";
    }
    case "sharpe":
    case "sortino":
    case "calmar":
      return value >= 1 ? "pos" : value > 0 ? "warn" : "neg";
    case "total_trades":
      // Below ~20 trades a month the result is directional, not decisive.
      return value >= 20 ? "flat" : "warn";
    default:
      return "flat";
  }
}

export function metricHint(
  key: keyof BacktestMetrics,
  metrics: BacktestMetrics,
): string | undefined {
  switch (key) {
    case "net_pnl":
      return metrics.gross_pnl !== null
        ? `Gross ${formatInrPlain(metrics.gross_pnl)}, costs included`
        : "Costs and slippage included";
    case "profit_factor":
      return "Winners ÷ losers · above 1.25 passes";
    case "max_drawdown_pct":
      return metrics.max_drawdown_duration_bars !== null
        ? `${Math.round(metrics.max_drawdown_duration_bars)} bars to recover`
        : "Peak to trough";
    case "total_trades":
      return (metrics.total_trades ?? 0) < 20
        ? "Under 20 — directional, not decisive"
        : metrics.trading_days !== null
          ? `Over ${metrics.trading_days} trading days`
          : undefined;
    case "win_rate":
      return metrics.avg_trade_pnl !== null
        ? `Avg ${formatInr(metrics.avg_trade_pnl)} per trade`
        : undefined;
    case "sharpe":
      return "Annualised from daily returns";
    default:
      return undefined;
  }
}

export type EquityPoint = {
  /** Trade sequence number — the x axis. */
  i: number;
  time: string;
  cumulative: number;
  net: number;
  drawdown: number;
};

/**
 * Cumulative net P&L across the realised trades.
 *
 * `run_backtest_signals` returns the equity curve only as `{start, end, bars}`
 * — no series — so the curve is derived from the trade records instead. That
 * needs no change to the Python engine, and every point still traces to an
 * engine-computed `net_pnl`; nothing here computes a P&L.
 */
export function tradesToEquity(trades: Trade[]): EquityPoint[] {
  let cumulative = 0;
  let peak = 0;
  return [...trades]
    .sort((a, b) => a.exit_time.localeCompare(b.exit_time))
    .map((t, i) => {
      cumulative += t.net_pnl;
      peak = Math.max(peak, cumulative);
      return {
        i: i + 1,
        time: t.exit_time,
        cumulative,
        net: t.net_pnl,
        drawdown: cumulative - peak,
      };
    });
}
