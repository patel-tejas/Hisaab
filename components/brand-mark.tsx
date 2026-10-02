import { cn } from "@/lib/utils"

/**
 * The Hisaab ledger mark.
 *
 * Extracted from the marketing logo so the app and the public site share one
 * brand. The dashboard previously rendered a bare "H" glyph in a 28px box,
 * which read as a placeholder next to the real mark used everywhere else.
 *
 * The cyan rule on the short bottom line is Cyan Signal (#00b3dd) — the one
 * chromatic the system reserves for data, which is exactly what a ledger line
 * is.
 */
export function BrandMark({
  className,
  size = 36,
}: {
  className?: string
  size?: number
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden",
        "rounded-[calc(var(--r)/2.6)] border border-[color-mix(in_oklab,var(--foreground)_10%,transparent)]",
        "bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]",
        "shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--foreground)_10%,transparent)]",
        className,
      )}
      style={{ width: size, height: size, ["--r" as string]: `${size}px` }}
      aria-hidden
    >
      <svg
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
        viewBox="0 0 20 20"
        fill="none"
        className="text-foreground"
      >
        <rect
          x="4"
          y="3.5"
          width="12"
          height="13"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M7 8h6M7 11h4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path d="M7 14h2.5" stroke="#00b3dd" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  )
}
