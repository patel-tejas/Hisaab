import Link from "next/link"
import { cn } from "@/lib/utils"

type HisaabLogoProps = {
  className?: string
  /** Dark mark for light skies; light mark for night/glass nav */
  tone?: "light" | "dark"
}

/** Crisp geometric mark — avoids the heavy PNG lockup in the nav. */
export function HisaabLogo({ className, tone = "dark" }: HisaabLogoProps) {
  const dark = tone === "dark"

  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="Hisaab home"
    >
      <span
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] transition-colors duration-200",
          dark ? "bg-void" : "bg-pure"
        )}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className={dark ? "text-pure" : "text-void"}
        >
          {/* Ledger / journal mark */}
          <rect
            x="4"
            y="3.5"
            width="12"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M7 8h6M7 11h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M7 14h2.5"
            stroke="#00b3dd"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span
        className={cn(
          "font-marketing text-[18px] font-medium tracking-[-0.02em] transition-colors duration-200",
          dark ? "text-void group-hover:text-void/80" : "text-pure group-hover:text-cloud"
        )}
      >
        Hisaab
      </span>
    </Link>
  )
}
