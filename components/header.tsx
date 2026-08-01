"use client"

import { usePathname } from "next/navigation"
import { Moon, Plus, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface HeaderProps {
  onNewTrade?: () => void
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/trades": "Trades",
  "/dashboard/calendar": "Calendar",
  "/dashboard/reports": "Analytics",
  "/dashboard/ai-insights": "AI Insights",
  "/dashboard/broker": "Brokers",
  "/dashboard/planner": "Daily Planner",
  "/dashboard/backtester": "Backtester",
  "/dashboard/settings": "Settings",
}

function getPageTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const match = Object.entries(PAGE_TITLES).find(
    ([path]) => path !== "/dashboard" && pathname.startsWith(path)
  )
  return match?.[1] ?? "Dashboard"
}

export function Header({ onNewTrade }: HeaderProps) {
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()
  const title = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-background px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <SidebarTrigger className="-ml-1 size-9 shrink-0 text-foreground/80 hover:bg-transparent hover:text-foreground [&_svg]:!size-5" />
        <span className="truncate text-sm text-foreground/90">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative size-9 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <Sun className="!size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute !size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <button
          type="button"
          onClick={onNewTrade}
          className="hidden h-9 items-center gap-1.5 rounded-2xl! bg-cyan-signal px-4 text-[13px] font-medium text-void shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_rgba(0,179,221,0.22)] transition-opacity duration-200 hover:opacity-90 md:inline-flex"
        >
          <Plus className="size-5" strokeWidth={2} />
          New Trade
        </button>
      </div>
    </header>
  )
}
