import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Motion, not just colour.
 *
 * Every variant now shares one spring curve and yields under the press
 * (`active:scale-[0.97]`). Instant state changes with a `transition-all`
 * default easing are what make an interface feel weightless; a button that
 * gives slightly reads as a physical control.
 *
 * Icon sizing drops from 20px to 16px: a 20px glyph beside 14px label text
 * was optically heavier than the text it accompanied.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium " +
    "transition-[background-color,border-color,color,transform,opacity] duration-200 " +
    "ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] " +
    "disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100 " +
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 " +
    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 " +
    "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/30",
        outline:
          "border border-border bg-transparent hover:bg-accent/60 hover:border-border hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-accent/60 hover:text-accent-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-5",
        icon: "size-9","icon-sm": "size-8","icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
