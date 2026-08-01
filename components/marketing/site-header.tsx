"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { HisaabLogo } from "@/components/marketing/hisaab-logo"
import { GetStartedButton } from "@/components/marketing/get-started-button"

type SiteHeaderProps = {
  className?: string
}

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
] as const

export function SiteHeader({ className }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 px-3 pt-5 sm:px-5 sm:pt-6",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between rounded-2xl border-0 outline-none transition-[max-width,background-color,box-shadow,height,padding] duration-300 ease-out",
          scrolled
            ? "h-[58px] max-w-[1080px] bg-void/40 px-5 shadow-[0_8px_32px_rgba(0,0,0,0.22)] backdrop-blur-[28px] sm:h-[62px] sm:px-7"
            : "h-[62px] max-w-[1200px] bg-transparent px-4 shadow-none backdrop-blur-0 sm:px-6"
        )}
      >
        <HisaabLogo tone="light" />

        <nav className="hidden items-center gap-1 md:flex lg:gap-1.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3.5 py-2 font-marketing text-[15px] text-pure/85 transition-colors duration-200 hover:text-pure"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <GetStartedButton size="nav" />
      </div>
    </header>
  )
}
