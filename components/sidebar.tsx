
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ArrowLeftRight, Calendar, Wrench, BarChart3, Settings2, Sparkles, ChevronsLeft, ChevronsRight, Brain, CalendarClock, FlaskConical, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/lib/sidebar-context"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/trades", icon: ArrowLeftRight, label: "Trades" },
  { href: "/dashboard/calendar", icon: Calendar, label: "Calendar" },
  { href: "/dashboard/reports", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/ai-insights", icon: Brain, label: "AI Insights" },
  { href: "/dashboard/broker", icon: Link2, label: "Brokers" },
  { href: "/dashboard/planner", icon: CalendarClock, label: "Daily Planner" },
  { href: "/dashboard/backtester", icon: FlaskConical, label: "Backtester" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside className={cn("fixed left-4 top-4 bottom-4 z-40 rounded-2xl glass border border-border flex flex-col transition-all duration-300 ease-in-out",
      collapsed ? "w-[72px]" : "w-60"
    )}>
      {/* Branding */}
      <div className={cn("flex h-20 items-center gap-3 border-b border-border mx-2", collapsed ? "justify-center px-2" : "px-6")}>
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary)] text-primary-foreground shadow-[var(--primary)]/30">
          <Sparkles className="h-5 w-5 fill-current" />
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20"></div>
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Hisaab
            </span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider">PRO TRADER</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-2 mt-2", collapsed ? "p-2" : "p-4")}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn("group relative flex items-center rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden",
                collapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
                isActive
                  ? "text-primary-foreground bg-primary shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-full"></div>
              )}
              <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings + Collapse Toggle */}
      <div className={cn("border-t border-border mx-2", collapsed ? "p-2" : "p-4")}>
        <Link
          href="/dashboard/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn("flex items-center w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
          )}
        >
          <Settings2 className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <button
          onClick={toggle}
          className={cn("flex items-center w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all mt-1",
            collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-5 w-5 shrink-0" /> : <ChevronsLeft className="h-5 w-5 shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
