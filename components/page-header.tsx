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
 * (never bolded), then body copy in Ash. Actions sit on the baseline at the
 * right so they line up across pages.
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
        "flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-6 md:pb-8",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="label-mono">{eyebrow}</p>}
        <h1
          className={cn(
            "font-display text-4xl leading-[0.95] tracking-tight md:text-5xl",
            eyebrow && "mt-2",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
