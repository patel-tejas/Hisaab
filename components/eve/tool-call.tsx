"use client";

/**
 * Rendered tool calls.
 *
 * Tool calls are shown, not hidden: the whole premise is that every number
 * traces to a `quant/` computation, so the user can see which tool produced it
 * and expand the raw payload to check. That is a research-integrity
 * requirement, not decoration.
 *
 * Consecutive calls render as one group of steps. Each step names the tool in
 * plain words, shows the arguments a reader scans for, and times itself while
 * it runs.
 */

import { useEffect, useState } from "react";
import { getToolName, isToolUIPart, type DynamicToolUIPart, type ToolUIPart } from "ai";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { LoaderGrid } from "@/components/eve/loading-state";

export type AnyToolPart = ToolUIPart | DynamicToolUIPart;

export { isToolUIPart };

const ACRONYMS = new Set(["ema", "atr", "pbo", "pnl", "oos", "csv", "rsi"]);

/** "validate_parameter_search" → "Validate parameter search" */
export function humanizeTool(name: string) {
  const words = name
    .split("_")
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w))
    .join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

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

export function toolRunning(part: AnyToolPart): boolean {
  return part.state === "input-streaming" || part.state === "input-available";
}

/** "month 2026-07 · timeframe 15m" */
function summarizeInput(input: unknown) {
  if (!input || typeof input !== "object") return "";
  return Object.entries(input as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => `${k.replace(/_/g, " ")} ${String(v)}`)
    .join(" · ");
}

// Wall-clock timings live outside React state so a re-render, or the message
// re-mounting while it streams, does not restart the clock.
const timings = new Map<string, { start: number; end?: number }>();

function useToolTiming(id: string, running: boolean) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (running) {
      if (!timings.has(id)) timings.set(id, { start: Date.now() });
      const iv = setInterval(() => setNow(Date.now()), 100);
      return () => clearInterval(iv);
    }
    const t = timings.get(id);
    if (t && !t.end) t.end = Date.now();
  }, [id, running]);

  const t = timings.get(id);
  const end = t?.end ?? now;
  if (!t || end === null) return null;
  const secs = Math.max(0, end - t.start) / 1000;
  return secs < 60 ? `${secs.toFixed(1)}s` : `${Math.floor(secs / 60)}m ${(secs % 60).toFixed(0)}s`;
}

function Block({ label, value }: { label: string; value: unknown }) {
  if (value === undefined) return null;
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div>
      <div className="label-mono mb-1.5">{label}</div>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border/60 bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {text}
      </pre>
    </div>
  );
}

export function ToolStep({ part }: { part: AnyToolPart }) {
  const [open, setOpen] = useState(false);
  const failed = toolFailed(part);
  const running = !failed && toolRunning(part);
  const elapsed = useToolTiming(part.toolCallId, running);
  const args = summarizeInput(part.input);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/50"
      >
        <span className="flex size-16 shrink-0 items-center justify-center">
          {running ? (
            <LoaderGrid variant="Orbit" />
          ) : (
            <span
              className={cn(
                "size-1.5 rounded-full",
                failed ? "bg-[var(--destructive)]" : "bg-[var(--success)]",
              )}
            />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[13px] font-medium text-foreground">{humanizeTool(getToolName(part))}</span>
          {args && <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{args}</span>}
        </span>
        <span
          className={cn(
            "shrink-0 font-mono text-[11px] tabular-nums",
            failed ? "text-[var(--destructive)]" : "text-muted-foreground",
          )}
        >
          {failed ? "Failed" : (elapsed ?? (running ? "Running" : "Done"))}
        </span>
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-spring"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 px-3 pt-1 pb-3">
            <Block label="Input" value={part.input} />
            {part.state === "output-available" && <Block label="Output" value={part.output} />}
            {part.state === "output-error" && <Block label="Error" value={part.errorText} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ToolSteps({ parts }: { parts: AnyToolPart[] }) {
  return (
    <div className="panel-inset flex flex-col p-1">
      {parts.map((part) => (
        <ToolStep key={part.toolCallId} part={part} />
      ))}
    </div>
  );
}
