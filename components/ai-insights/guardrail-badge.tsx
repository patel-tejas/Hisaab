"use client"

import { useState } from "react"
import { ChevronDown, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GuardrailReport } from "@/lib/ai/guardrail/types"

const STATUS = {
  verified: {
    icon: ShieldCheck,
    label: "Verified",
    tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  corrected: {
    icon: ShieldAlert,
    label: "Auto-corrected",
    tone: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  fallback: {
    icon: ShieldQuestion,
    label: "Computed only",
    tone: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  },
} as const

const ACTION_LABEL: Record<string, string> = {
  corrected: "Corrected",
  removed: "Removed",
  replaced: "Replaced",
  kept: "Noted",
}

function prettyPath(path: string): string {
  return path
    .replace(/\[(\d+)\]/g, (_, i) => ` #${Number(i) + 1}`)
    .replace(/\./g, " › ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
}

/**
 * Shows how the AI answer fared against the code-based checks, with the
 * list of what was corrected. Renders nothing for answers saved before the
 * guardrail existed.
 */
export function GuardrailBadge({ report, className }: { report?: GuardrailReport | null; className?: string }) {
  const [open, setOpen] = useState(false)
  if (!report) return null

  const meta = STATUS[report.status] ?? STATUS.verified
  const Icon = meta.icon
  const visible = report.issues.filter((i) => i.severity !== "info")
  const notes = report.issues.length - visible.length
  const pct = Math.round(report.accuracy * 100)

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
          meta.tone
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
        {report.status !== "fallback" && <span className="opacity-70">· {pct}% accurate</span>}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-4 text-left shadow-xl">
          <p className="text-xs font-semibold text-foreground">Checked against your trades</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {report.claimsVerified}/{report.claimsChecked} numbers in the text matched your data, and{" "}
            {report.fieldsChecked - report.fieldsCorrected}/{report.fieldsChecked} verdicts agreed with the computed values.
            {report.attempts > 1 && " The AI was asked to fix its first answer once."}
            {report.usedFallback && " The AI did not respond, so this report is computed directly from your trades."}
          </p>

          {visible.length > 0 ? (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {visible.map((issue, i) => (
                <li key={i} className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {prettyPath(issue.path)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        issue.action === "kept" ? "text-muted-foreground" : "text-amber-500"
                      )}
                    >
                      {ACTION_LABEL[issue.action] ?? issue.action}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground leading-relaxed">{issue.message}</p>
                  {issue.expected && issue.kind === "unverified_number" && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{issue.expected}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-emerald-500">Every number and verdict matched your data.</p>
          )}

          {notes > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {notes} target{notes === 1 ? "" : "s"} in the advice {notes === 1 ? "is" : "are"} new numbers, not facts from your history.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
