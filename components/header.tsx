"use client"

import { usePathname } from "next/navigation"
import { Moon, Plus, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { pageTitle } from "@/lib/nav"

interface HeaderProps {
  onNewTrade?: () => void
  onOpenCommand?: () => void
}

export function Header({ onNewTrade, onOpenCommand }: HeaderProps) {
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()
  const title = pageTitle(pathname)

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-background px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <SidebarTrigger className="-ml-1 size-9 shrink-0 text-foreground/80 hover:bg-transparent hover:text-foreground [&_svg]:!size-5" />
        <span className="truncate text-sm text-foreground/90">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Search pages and actions"
          className="hidden h-9 items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-3 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground md:inline-flex"
        >
          <Search className="size-4" />
          <span>Search</span>
          <kbd className="label-mono rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] tracking-normal">Ctrl K</kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative size-9 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <Sun className="!size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-[var(--warning)]" />
          <Moon className="absolute !size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-[var(--primary)]" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <button
          type="button"
          onClick={onNewTrade}
          className="hidden h-9 items-center gap-1.5 rounded-2xl! bg-cyan-signal px-4 text-[13px] font-medium text-void shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_12px_rgba(0,179,221,0.22)] transition-opacity duration-200 hover:opacity-90 md:inline-flex"
        >
          <Plus className="size-4" strokeWidth={2} />
          New Trade
        </button>
      </div>
    </header>
  )
}
