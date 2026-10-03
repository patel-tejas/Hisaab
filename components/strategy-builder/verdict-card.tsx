"use client";

/**
 * The honest verdict on a strategy version. Leads with the label, then every
 * reason that applied, the in-sample vs holdout numbers side by side, and the
 * standing caveat. Nothing here is softened: the engine wrote the verdict.
 */

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { formatMetric } from "@/components/eve/metrics";
import { cn } from "@/lib/utils";
import type { BacktestMetrics } from "@/lib/eve/strategy";
import type { Verdict } from "./api";

const TONE: Record<Verdict["label"], { icon: typeof CheckCircle2; className: string }> = {
  survived_holdout: { icon: CheckCircle2, className: "border-[var(--success)]/40 text-[var(--success)]" },
  lags_buy_and_hold: { icon: AlertTriangle, className: "border-[var(--warning)]/50 text-[var(--warning)]" },
  too_few_trades: { icon: AlertTriangle, className: "border-[var(--warning)]/50 text-[var(--warning)]" },
  not_significant: { icon: XCircle, className: "border-[var(--destructive)]/40 text-[var(--destructive)]" },
  failed_holdout: { icon: XCircle, className: "border-[var(--destructive)]/40 text-[var(--destructive)]" },
};

const ROWS: (keyof BacktestMetrics)[] = ["net_pnl", "profit_factor", "total_trades", "win_rate", "max_drawdown_pct", "sharpe"];

export function VerdictCard({
  verdict,
  holdoutMetrics,
  createdAt,
}: {
  verdict: Verdict;
  holdoutMetrics: Partial<BacktestMetrics> | null;
  createdAt?: string;
}) {
  const tone = TONE[verdict.label] ?? TONE.not_significant;
  const Icon = tone.icon;
  const dsr = verdict.deflated_sharpe?.deflated_sharpe;
  const inSample = verdict.in_sample_metrics ?? {};

  return (
    <div className="space-y-16">
      <div className={cn("flex items-start gap-12 rounded-lg border px-16 py-12", tone.className)}>
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{verdict.headline}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Tuned on {verdict.in_sample_month}, tested once on {verdict.holdout_month}
            {createdAt ? ` · ${new Date(createdAt).toLocaleString("en-IN")}` : ""}
          </p>
        </div>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
        {verdict.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-1.5 text-left font-normal" />
            <th className="py-1.5 text-right font-normal">In-sample · {verdict.in_sample_month}</th>
            <th className="py-1.5 text-right font-normal">Holdout · {verdict.holdout_month}</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {ROWS.map((k) => (
            <tr key={k} className="border-t border-border/60">
              <td className="py-1.5 font-sans text-muted-foreground">{LABEL[k]}</td>
              <td className="py-1.5 text-right">{formatMetric(k, (inSample[k] ?? null) as number | null)}</td>
              <td className="py-1.5 text-right">{formatMetric(k, (holdoutMetrics?.[k] ?? null) as number | null)}</td>
            </tr>
          ))}
          <tr className="border-t border-border/60">
            <td className="py-1.5 font-sans text-muted-foreground">Buy and hold</td>
            <td className="py-1.5 text-right text-muted-foreground">·</td>
            <td className="py-1.5 text-right">{formatMetric("net_pnl", verdict.benchmark?.gross_pnl ?? null)}</td>
          </tr>
        </tbody>
      </table>

      <dl className="grid grid-cols-2 gap-12 text-xs">
        <div>
          <dt className="text-muted-foreground">Tries counted</dt>
          <dd className="mt-0.5 font-mono">{verdict.trials}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Chance it beats luck</dt>
          <dd className="mt-0.5 font-mono">{dsr == null ? "not enough data" : `${Math.round(dsr * 100)}% (needs 95%)`}</dd>
        </div>
      </dl>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {verdict.caveat} Buy and hold is gross, before costs.
      </p>
    </div>
  );
}

const LABEL: Record<string, string> = {
  net_pnl: "Net P&L",
  profit_factor: "Profit factor",
  total_trades: "Trades",
  win_rate: "Win rate",
  max_drawdown_pct: "Max drawdown",
  sharpe: "Sharpe",
};
