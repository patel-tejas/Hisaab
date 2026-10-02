import type React from "react"

import { cn } from "@/lib/utils"

/**
 * The single page header for every dashboard route.
 *
 * Before this existed, nine pages carried six different treatments — three
 * sizes, inconsistent bottom margins, icons sometimes inside the <h1>, and one
 * gradient-clipped title. Consistent headers are most of what makes a product
 * feel like one product rather than a set of screens.
 *
 * Structure follows DESIGN.md: a mono eyebrow, the display voice at weight 400
 * (never bolded), then body copy in Ash.
 */
export function PageHeader({
  icon,
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  /**
   * A lucide icon element. Rendered in its own enclosure beside the title
   * block rather than inline inside the <h1> — an icon sitting in display-size
   * text inflates the line box and shifts the baseline, and no single glyph
   * size looks right against a 44px serif.
   */
  icon?: React.ReactNode
  eyebrow?: string
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        /*
         * `items-start`, not `items-end`. Aligning to the end dragged page
         * chrome (status indicators, filters) down to the baseline of the
         * description, so it read as a caption on the paragraph rather than as
         * controls belonging to the page.
         *
         * The rule gives the header a defined edge instead of letting it bleed
         * into the content below on an otherwise borderless dark canvas.
         */
        "mb-7 flex flex-wrap items-start justify-between gap-x-10 gap-y-5",
        "border-b border-border/60 pb-6 md:mb-8 md:pb-7",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <span
            className={cn(
              "mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl",
              "border border-border bg-secondary/50 text-foreground",
              "shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]",
              "[&>svg]:size-5",
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="label-mono">{eyebrow}</p>}
          <h1
            className={cn(
              "font-display text-4xl leading-[1.02] tracking-tight md:text-[2.75rem]",
              eyebrow && "mt-2.5",
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {actions && (
        /*
         * Nudged down so the controls sit optically level with the title
         * rather than the eyebrow above it.
         */
        <div className="flex shrink-0 items-center gap-2 pt-0.5 md:pt-1.5">
          {actions}
        </div>
      )}
    </header>
  )
}
