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
 * A negative verdict renders as a finding, never an error. On one or two
 * months it is the expected outcome, and dressing it as a fault would push the
 * user to keep searching until something passes by luck.
 */

import { ArrowRight, Check, Loader2, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  return (
    <section className="panel overflow-hidden">
      <header className="panel-px pt-5 md:pt-6">
        <p className="label-mono">Does this hold up?</p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          One good backtest is not evidence. These are two different questions
          and they need different tests.
        </p>
      </header>

      <div className="mt-4 divide-y divide-border/60 border-t border-border/60">
        <Test
          label="These parameters"
          blurb="Bootstraps a confidence interval around this configuration's Sharpe. If the interval spans zero, the result is not separable from luck."
          action="Run test"
          busy={loading === "config"}
          busyLabel="Resampling returns and trade order…"
          disabled={loading !== null}
          onRun={() => onRun("config")}
          hasResult={!!significance}
        >
          {significance && <SignificanceVerdict report={significance} />}
        </Test>

        <Test
          label="The parameter search"
          blurb="Searches the whole grid for this month and timeframe, then applies the corrections a searched-for winner needs — deflated Sharpe, a bootstrap interval, and PBO."
          action="Search the grid"
          busy={loading === "grid"}
          busyLabel="Running the grid and its corrections…"
          disabled={loading !== null}
          onRun={() => onRun("grid")}
          hasResult={!!validation}
        >
          {validation && <ValidationVerdict report={validation} />}
        </Test>
      </div>

      {(significance || validation) && (
        <p className="panel-px border-t border-border/60 py-3 text-xs leading-snug text-muted-foreground">
          Based on {monthCount === 1 ? "one month" : `${monthCount} months`} of
          NIFTY futures data. No amount of statistics makes that a long sample —
          treat any verdict as provisional.
        </p>
      )}
    </section>
  );
}

function Test({
  label,
  blurb,
  action,
  busy,
  busyLabel,
  disabled,
  onRun,
  hasResult,
  children,
}: {
  label: string;
  blurb: string;
  action: string;
  busy: boolean;
  busyLabel: string;
  disabled: boolean;
  onRun: () => void;
  hasResult: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel-px py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {!hasResult && !busy && (
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
              {blurb}
            </p>
          )}
        </div>
        {!hasResult && (
          <Button
            size="sm"
            variant="outline"
            className="interactive shrink-0 gap-1.5"
            onClick={onRun}
            disabled={disabled}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <>
                {action}
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        )}
      </div>

      {busy && (
        <p className="mt-2 text-xs text-muted-foreground">{busyLabel}</p>
      )}
      {children}
    </div>
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
    <div className="mt-3 flex gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          pass
            ? "bg-[var(--success)]/15 text-[var(--success)]"
            : "bg-secondary text-muted-foreground",
        )}
      >
        {pass ? <Check className="size-3" /> : <Minus className="size-3" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <div className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
          {children}
        </div>
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
      title={pass ? "Separable from luck" : "Not separable from luck"}
    >
      Sharpe <span className="numeric text-foreground">{fmt(ci.observed_sharpe)}</span>,
      95% interval{" "}
      <span className="numeric text-foreground">
        {fmt(ci.ci_lower)} to {fmt(ci.ci_upper)}
      </span>
      .{" "}
      {pass
        ? "The interval stays on one side of zero."
        : "The interval spans zero, so the true Sharpe could as easily be negative."}
      {typeof ci.prob_positive === "number" && (
        <> {Math.round(ci.prob_positive * 100)}% of resamples came out positive.</>
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
        title={credible ? "The search survived" : "The search did not survive"}
      >
        {credible
          ? "Deflated Sharpe, the bootstrap interval and PBO all came back favourable — uncommon on a sample this short."
          : "The best configuration in the grid is not separable from what the search would turn up by luck. There is no evidence of an edge here."}
      </Verdict>
      {Array.isArray(report.summary) && report.summary.length > 0 && (
        <ul className="panel-quiet numeric mt-3 space-y-1 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {report.summary.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </>
  );
}
