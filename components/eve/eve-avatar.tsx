import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Eve's mark beside her turns: the same machined tile as the Hisaab
 * BrandMark, with a spark instead of the ledger.
 */
export function EveAvatar({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[7px] border",
        "border-[color-mix(in_oklab,var(--foreground)_10%,transparent)]",
        "bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] text-foreground",
        "shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--foreground)_10%,transparent)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Sparkles style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}
