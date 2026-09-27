"use client";

/**
 * What is wrong with the numbers above — see `integrity.ts` for the analysis
 * and why this is prominent rather than a footnote.
 */

import { AlertTriangle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatInr } from "@/components/ai-insights/format";
import { REAL_LOT_SIZE, analyzeIntegrity } from "@/components/eve/integrity";
import type { BacktestResult } from "@/lib/eve/strategy";

export function IntegrityNotice({ result }: { result: BacktestResult }) {
  const a = analyzeIntegrity(result);
  if (!a || a.clean) return null;

  const trades = result.trades ?? [];

  return (
    <Card className="space-y-2.5 border-amber-300 bg-amber-50/70 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
      <p className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Read these numbers with care
      </p>

      <ul className="list-disc space-y-1.5 pl-5 text-amber-900/90 dark:text-amber-200/90">
        {a.lotWrong && (
          <li>
            The engine sized positions at <strong>{a.lotUsed} contracts</strong> per lot. The
            real NIFTY contract for this period is <strong>{REAL_LOT_SIZE}</strong>, and the
            tick is ₹0.10 rather than ₹0.05 — so both the P&amp;L and the slippage above are
            understated.
          </li>
        )}
        {a.overnight.length > 0 && (
          <li>
            No end-of-day square-off is applied, so{" "}
            <strong>
              {a.allOvernight
                ? `every one of these ${trades.length} trades`
                : `${a.overnight.length} of ${trades.length} trades`}
            </strong>{" "}
            {a.allOvernight ? "was" : "were"} held across sessions and marked through
            overnight gaps — exposure an intraday strategy would never actually carry.
          </li>
        )}
      </ul>

      {a.dependsOnOvernight && (
        <div className="rounded-md border border-amber-400/70 bg-amber-100/70 p-2.5 dark:border-amber-800 dark:bg-amber-900/30">
          <p className="font-medium text-amber-950 dark:text-amber-100">
            The positive result rests on that overnight exposure.
          </p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
            {a.allOvernight ? (
              <>
                Not one position was closed within its own session, so the{" "}
                {formatInr(a.total)} headline is entirely a product of multi-day holds the
                square-off would have prevented.
              </>
            ) : (
              <>
                Those {a.overnight.length}{" "}
                {a.overnight.length === 1 ? "trade totals" : "trades total"}{" "}
                {formatInr(a.overnightNet)}, while the {a.intraday.length} closed within
                their own session{" "}
                {a.intraday.length === 1 ? "totals" : "total"} {formatInr(a.intradayNet)}.
              </>
            )}{" "}
            Treat the headline as an artifact of the backtest window, not as an edge.
          </p>
        </div>
      )}

      <p className="text-amber-900/70 dark:text-amber-200/70">
        Fixing this means passing a <code className="font-mono">MarketContext</code> and{" "}
        <code className="font-mono">ExitConfig</code> in the bridge&apos;s{" "}
        <code className="font-mono">_backtest_config()</code>. Until then, signal counts are
        trustworthy but P&amp;L is not.
      </p>
    </Card>
  );
}
