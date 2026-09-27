"use client";

/**
 * "Will this strategy actually work?"
 *
 * Two different questions, two different tools — the `research-workflows` skill
 * is explicit about not confusing them:
 *
 * - **This exact config** → `backtest_significance`. Headline:
 *   `sharpe_ci.excludes_zero`. No multiple-testing correction, because there
 *   was no search.
 * - **The whole grid** → `validate_parameter_search`. Headline: `credible`.
 *   Adds deflated Sharpe, a bootstrap interval and PBO, because the best of
 *   ~320 draws is comfortably positive even when nothing works.
 *
 * A negative verdict is rendered as a finding, never an error. On one or two
 * months it is the expected outcome, and dressing it as a fault would push the
 * user to keep searching until something passes by luck.
 */

import { CheckCircle2, HelpCircle, Info, Loader2, ShieldQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SignificanceReport = {
  sharpe_ci?: {
    observed_sharpe?: number;
    ci_lower?: number;
    ci_upper?: number;
    prob_positive?: number;
    excludes_zero?: boolean;
  } | null;
  permutation?: { p_value?: number } | null;
  skipped?: Record<string, string>;
  note?: string;
  [key: string]: unknown;
};

export type ValidationReport = {
  credible?: boolean;
  summary?: string[];
  [key: string]: unknown;
};

export type VerdictKind = "config" | "grid";

export function VerdictPanel({
  significance,
  validation,
  loading,
  onRun,
  monthCount,
}: {
  significance: SignificanceReport | null;
  validation: ValidationReport | null;
  loading: VerdictKind | null;
  onRun: (kind: VerdictKind) => void;
  monthCount: number;
}) {
  const sampleNote = (
    <p className="flex items-start gap-1.5 border-t pt-2.5 text-[11px] leading-snug text-muted-foreground">
      <Info className="mt-0.5 h-3 w-3 shrink-0" />
      Based on {monthCount === 1 ? "one month" : `${monthCount} months`} of NIFTY futures
      data. No amount of statistics makes that a long sample — treat any verdict as
      provisional.
    </p>
  );

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start gap-2.5">
        <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Does this hold up?</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A single good backtest is not evidence. These are two different questions and
            they need different tests.
          </p>
        </div>
      </div>

      {/* --- this exact configuration ------------------------------------- */}
      <div className="space-y-2 border-t pt-3">
        <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
          These parameters
        </p>
        {loading === "config" ? (
          <Busy>Resampling this config&apos;s own returns and trade order…</Busy>
        ) : significance ? (
          <SignificanceVerdict report={significance} />
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Bootstraps a confidence interval around this configuration&apos;s Sharpe. If
              the interval spans zero, the result is not distinguishable from luck.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => onRun("config")}
              disabled={loading !== null}
            >
              Test these parameters
            </Button>
          </>
        )}
      </div>

      {/* --- the search itself ------------------------------------------- */}
      <div className="space-y-2 border-t pt-3">
        <p className="font-mono-label text-[10px] uppercase tracking-wider text-muted-foreground">
          The parameter search
        </p>
        {loading === "grid" ? (
          <Busy>Running the grid and its corrections — a few seconds on 15m candles…</Busy>
        ) : validation ? (
          <ValidationVerdict report={validation} />
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Searches the whole grid for this month and timeframe, then applies the
              corrections that a searched-for winner needs — deflated Sharpe, a bootstrap
              interval, and PBO.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => onRun("grid")}
              disabled={loading !== null}
            >
              Does searching this grid find an edge?
            </Button>
          </>
        )}
      </div>

      {(significance || validation) && sampleNote}
    </Card>
  );
}

function Busy({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      {children}
    </p>
  );
}

function Verdict({
  pass,
  title,
  children,
}: {
  pass: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-2.5",
        pass
          ? "border-emerald-400/50 bg-emerald-50/60 dark:bg-emerald-950/20"
          : "border-border bg-muted/40",
      )}
    >
      <p className="flex items-start gap-1.5 text-xs font-medium">
        {pass ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {title}
      </p>
      <div className="mt-1 pl-5 text-[11px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function SignificanceVerdict({ report }: { report: SignificanceReport }) {
  const ci = report.sharpe_ci;
  if (!ci) {
    const why = Object.values(report.skipped ?? {}).join("; ");
    return (
      <Verdict pass={false} title="Not enough trades to test">
        {why || "This configuration produced too few trades to resample."}
      </Verdict>
    );
  }

  const pass = ci.excludes_zero === true;
  const fmt = (n?: number) => (typeof n === "number" ? n.toFixed(2) : "—");

  return (
    <Verdict
      pass={pass}
      title={
        pass
          ? "Distinguishable from luck"
          : "Not distinguishable from luck"
      }
    >
      Sharpe {fmt(ci.observed_sharpe)}, with a 95% interval from {fmt(ci.ci_lower)} to{" "}
      {fmt(ci.ci_upper)}.{" "}
      {pass
        ? "The interval stays on one side of zero."
        : "The interval spans zero, so the true Sharpe could just as easily be negative."}
      {typeof ci.prob_positive === "number" && (
        <>
          {" "}
          {Math.round(ci.prob_positive * 100)}% of resamples came out positive.
        </>
      )}
    </Verdict>
  );
}

function ValidationVerdict({ report }: { report: ValidationReport }) {
  const credible = report.credible === true;
  return (
    <>
      <Verdict
        pass={credible}
        title={credible ? "The search survived its corrections" : "The search did not survive"}
      >
        {credible
          ? "Deflated Sharpe, the bootstrap interval and PBO all came back favourable — a genuinely uncommon result on a sample this short."
          : "The best configuration in the grid is not distinguishable from what the search would turn up by luck. There is no evidence of an edge here."}
      </Verdict>
      {Array.isArray(report.summary) && report.summary.length > 0 && (
        <ul className="space-y-1 pl-0.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {report.summary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </>
  );
}
