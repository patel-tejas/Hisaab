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
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
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
