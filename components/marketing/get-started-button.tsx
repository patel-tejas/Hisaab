"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { LogIn } from "@/components/animate-ui/icons/log-in"
import { AnimateIcon } from "@/components/animate-ui/icons/icon"

type GetStartedButtonProps = {
  className?: string
  size?: "nav" | "hero"
}

/** Cyan CTA — black icon chip, animate-ui LogIn on hover (Sign Up / GAIA style). */
export function GetStartedButton({
  className,
  size = "nav",
}: GetStartedButtonProps) {
  const isHero = size === "hero"

  return (
    <AnimateIcon animateOnHover asChild>
      <Link
        href="/sign-up"
        className={cn(
          "inline-flex items-center font-marketing font-medium text-void",
          "rounded-2xl bg-cyan-signal",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_24px_rgba(0,179,221,0.25)]",
          "transition-opacity duration-200 hover:opacity-90",
          isHero
            ? "gap-3 px-8 py-[18px] text-[17px]"
            : "gap-2.5 px-5 py-2.5 text-[15px]",
          className
        )}
      >
        Get started
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-void text-cyan-signal",
            isHero ? "h-8 w-8" : "h-7 w-7"
          )}
          aria-hidden
        >
          <LogIn size={isHero ? 16 : 14} className="shrink-0" />
        </span>
      </Link>
    </AnimateIcon>
  )
}
