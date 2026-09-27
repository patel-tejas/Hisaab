"use client";

/**
 * Whether the numbers in an answer trace to the tool results above it.
 *
 * Advisory: it reports, it does not block. The system prompt tells the model
 * never to compute a figure itself; this is what checks that it didn't.
 */

import { ChevronRight } from "lucide-react";

import type { GroundingReport } from "@/lib/eve/bridge";

export function GroundingBadge({ report }: { report: GroundingReport }) {
  if (report.total_claims === 0) return null;

  if (report.grounded) {
    return (
      <div
        title={report.summary}
        className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {report.total_claims} {report.total_claims === 1 ? "figure" : "figures"} traced to
        tool results
      </div>
    );
  }

  return (
    <details className="group rounded-md border border-amber-300 bg-amber-50 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5">
        <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90" />
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
        {report.ungrounded_claims} of {report.total_claims} figures do not trace to a tool
        result
      </summary>
      <ul className="space-y-1 border-t border-amber-300 px-2.5 py-1.5 dark:border-amber-900/60">
        {report.ungrounded.map((claim, i) => (
          <li key={i}>
            <span className="font-mono font-medium">{claim.text}</span>
            <span className="opacity-70">
              {" "}
              — line {claim.line}: {claim.context}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
