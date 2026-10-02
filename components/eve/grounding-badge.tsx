"use client";

/**
 * Whether the numbers in an answer trace to the tool results above it.
 *
 * Advisory: it reports, it does not block. The system prompt tells the model
 * never to compute a figure itself; this is what checks that it didn't.
 */

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GroundingReport } from "@/lib/eve/bridge";

export function GroundingBadge({ report }: { report: GroundingReport }) {
  const [open, setOpen] = useState(false);
  if (report.total_claims === 0) return null;

  if (report.grounded) {
    return (
      <span
        title={report.summary}
        className="flex h-6 items-center gap-1.5 rounded-full bg-[var(--success)]/10 px-2.5 text-[11.5px] font-medium text-[var(--success)]"
      >
        <span className="size-1.5 rounded-full bg-[var(--success)]" />
        {report.total_claims} {report.total_claims === 1 ? "figure" : "figures"} traced to tool results
      </span>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 items-center gap-1.5 rounded-full bg-[var(--warning)]/10 px-2.5 text-[11.5px] font-medium text-[var(--warning)]"
      >
        <span className="size-1.5 rounded-full bg-[var(--warning)]" />
        {report.ungrounded_claims} of {report.total_claims} figures do not trace to a tool result
        <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <ul
          className="panel-inset mt-2 space-y-1 p-3 text-xs text-muted-foreground"
          style={{ animation: "fade-up 250ms cubic-bezier(0.22,1,0.36,1) both" }}
        >
          {report.ungrounded.map((claim, i) => (
            <li key={i}>
              <span className="font-mono font-medium text-foreground">{claim.text}</span>
              <span className="opacity-70"> · line {claim.line}: </span>
              {claim.context}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
