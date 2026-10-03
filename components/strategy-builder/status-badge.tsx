import { cn } from "@/lib/utils";
import type { StrategyStatus } from "./api";

const STYLE: Record<StrategyStatus, string> = {
  draft: "border-border text-muted-foreground",
  validated: "border-border text-foreground",
  backtested: "border-[var(--success)]/40 text-[var(--success)]",
  paper: "border-[var(--warning)]/50 text-[var(--warning)]",
  archived: "border-border/60 text-muted-foreground line-through",
};

const LABEL: Record<StrategyStatus, string> = {
  draft: "Draft",
  validated: "Valid",
  backtested: "Backtested",
  paper: "Paper trading",
  archived: "Archived",
};

export function StatusBadge({ status, className }: { status: StrategyStatus; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium", STYLE[status], className)}>
      {LABEL[status]}
    </span>
  );
}
