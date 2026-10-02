"use client";

/**
 * A rendered tool call.
 *
 * Tool calls are shown, not hidden: the whole premise is that every number
 * traces to a `quant/` computation, so the user can see which tool produced it
 * and expand the raw payload to check. That is a research-integrity
 * requirement, not decoration.
 */

import { getToolName, isToolUIPart, type DynamicToolUIPart, type ToolUIPart } from "ai";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type AnyToolPart = ToolUIPart | DynamicToolUIPart;

export { isToolUIPart };

function hasErrorOutput(part: AnyToolPart): boolean {
  return (
    part.state === "output-available" &&
    typeof part.output === "object" &&
    part.output !== null &&
    "error" in part.output
  );
}

export function toolFailed(part: AnyToolPart): boolean {
  return part.state === "output-error" || hasErrorOutput(part);
}

function Block({ label, value }: { label: string; value: unknown }) {
  if (value === undefined) return null;
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div>
      <div className="label-mono mb-1 text-muted-foreground">
        {label}
      </div>
      <pre className="max-h-64 overflow-auto rounded-lg bg-background/60 p-3 font-mono text-[11px] leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

export function ToolCall({ part }: { part: AnyToolPart }) {
  const name = getToolName(part);
  const done = part.state === "output-available";
  const failed = toolFailed(part);

  return (
    <details className="group rounded-lg border bg-card/60 text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            failed ? "bg-[var(--destructive)]" : done ? "bg-[var(--success)]" : "animate-pulse bg-[var(--warning)]",
          )}
        />
        <span className="font-mono font-medium">{name}</span>
        <span className="text-muted-foreground">
          {failed ? "failed" : done ? "ok" : "running…"}
        </span>
      </summary>
      <div className="space-y-2 border-t px-3 py-2">
        <Block label="input" value={part.input} />
        {part.state === "output-available" && <Block label="output" value={part.output} />}
        {part.state === "output-error" && <Block label="error" value={part.errorText} />}
      </div>
    </details>
  );
}
