"use client";

/**
 * What Eve built from the user's words, as a card: the template summary (made
 * by code from the spec, so it is exactly what runs), the values Eve chose on
 * its own, the engine's warnings, and what the format could not express.
 *
 * In the builder the button loads the spec into the form. Elsewhere it opens
 * the builder with the spec.
 */

import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Check, CircleHelp, Wand2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stashSpec } from "@/lib/eve/spec/handoff";
import type { ClarificationOutput, ProposeSpecOutput } from "@/lib/eve/strategy-tools";

export function SpecCard({
  out,
  onLoad,
  isLoaded,
}: {
  out: ProposeSpecOutput;
  onLoad?: (out: ProposeSpecOutput) => void;
  isLoaded: boolean;
}) {
  const router = useRouter();
  const usable = !!out.spec;

  function open() {
    if (!out.spec) return;
    if (onLoad) {
      onLoad(out);
      return;
    }
    stashSpec(out.spec);
    router.push("/dashboard/strategies/new?from=chat");
  }

  return (
    <div className="panel-inset space-y-16 px-16 py-16">
      <div className="flex items-start justify-between gap-12">
        <div className="min-w-0 space-y-1">
          <p className="label-mono flex items-center gap-1.5">
            <StatusIcon status={out.status} />
            {out.status === "valid"
              ? "Strategy built"
              : out.status === "unchecked"
                ? "Strategy built, not yet checked by the engine"
                : "Strategy needs fixes"}
          </p>
          {out.spec?.name && <p className="truncate text-sm font-medium">{out.spec.name}</p>}
        </div>
        {usable && (
          <Button
            variant={isLoaded ? "outline" : "default"}
            onClick={open}
            className="h-32 shrink-0 gap-1.5 rounded-lg px-3 text-xs"
          >
            {isLoaded ? (
              <>
                <Check className="size-3.5" /> In the form
              </>
            ) : onLoad ? (
              <>
                <Wand2 className="size-3.5" /> Use this
              </>
            ) : (
              <>
                <ArrowUpRight className="size-3.5" /> Open in builder
              </>
            )}
          </Button>
        )}
      </div>

      {out.summary && <p className="text-sm leading-relaxed">{out.summary}</p>}

      {out.defaulted.length > 0 && (
        <div className="space-y-1.5">
          <p className="label-mono">Eve chose these for you</p>
          <div className="flex flex-wrap gap-1.5">
            {out.defaulted.map((path) => (
              <span
                key={path}
                className="rounded-md border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-2 py-0.5 font-mono text-[11px]"
              >
                {path}
              </span>
            ))}
          </div>
        </div>
      )}

      {out.repaired && <p className="text-xs text-muted-foreground">{out.repaired}</p>}

      <IssueList title="Errors" issues={out.errors} tone="error" />
      <IssueList title="Warnings" issues={out.warnings} tone="warning" />

      {out.unsupported.length > 0 && (
        <div className="space-y-1">
          <p className="label-mono">Could not express</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {out.unsupported.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      )}

      {out.engine_error && (
        <p className="text-xs text-muted-foreground">Engine check skipped: {out.engine_error}</p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: ProposeSpecOutput["status"] }) {
  if (status === "valid") return <Check className="size-3.5 text-[var(--success)]" />;
  if (status === "unchecked") return <AlertTriangle className="size-3.5 text-[var(--warning)]" />;
  return <XCircle className="size-3.5 text-[var(--destructive)]" />;
}

export function IssueList({
  title,
  issues,
  tone,
  onSelect,
}: {
  title: string;
  issues: { path: string; message: string }[];
  tone: "error" | "warning";
  onSelect?: (path: string) => void;
}) {
  if (!issues.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="label-mono">{title}</p>
      <ul className="space-y-1">
        {issues.map((i, n) => (
          <li
            key={`${i.path}-${n}`}
            className={cn(
              "space-y-0.5 rounded-md px-2 py-1.5 text-xs",
              tone === "error"
                ? "bg-[var(--destructive)]/[0.07] text-[var(--destructive)]"
                : "bg-[var(--warning)]/10 text-foreground",
              onSelect && "cursor-pointer hover:opacity-80",
            )}
            onClick={onSelect ? () => onSelect(i.path) : undefined}
          >
            <span className="block break-all font-mono text-[10px] opacity-70">{i.path}</span>
            <span className="block">{i.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClarifyCard({
  out,
  disabled,
  onAnswer,
}: {
  out: ClarificationOutput;
  disabled: boolean;
  onAnswer: (text: string) => void;
}) {
  return (
    <div className="panel-inset space-y-12 px-16 py-16">
      <p className="label-mono flex items-center gap-1.5">
        <CircleHelp className="size-3.5" /> Eve needs one answer
      </p>
      <p className="text-sm font-medium">{out.question}</p>
      {out.why && <p className="text-xs text-muted-foreground">{out.why}</p>}
      <div className="flex flex-wrap gap-2">
        {out.options.map((option) => (
          <Button
            key={option}
            variant="outline"
            disabled={disabled}
            onClick={() => onAnswer(option)}
            className="h-32 rounded-lg px-3 text-xs"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
