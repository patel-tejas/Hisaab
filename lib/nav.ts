import {
  ArrowLeftRight,
  BarChart3,
  Blocks,
  Brain,
  Calculator,
  Calendar,
  CalendarClock,
  FlaskConical,
  LayoutDashboard,
  Link2,
  Settings2,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
}

/**
 * The dashboard's routes, defined once. The sidebar, the header title and the
 * Cmd-K palette all read this list, so adding a page here adds it everywhere.
 */
export const NAV_MAIN: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Trades", url: "/dashboard/trades", icon: ArrowLeftRight },
  { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
  { title: "Analytics", url: "/dashboard/reports", icon: BarChart3 },
  { title: "AI Insights", url: "/dashboard/ai-insights", icon: Brain },
  { title: "Brokers", url: "/dashboard/broker", icon: Link2 },
  { title: "Daily Planner", url: "/dashboard/planner", icon: CalendarClock },
  { title: "Backtester", url: "/dashboard/backtester", icon: FlaskConical },
  { title: "Tools", url: "/dashboard/tools", icon: Calculator },
  { title: "Eve Agent", url: "/dashboard/agent", icon: Sparkles },
  { title: "Strategies", url: "/dashboard/strategies", icon: Blocks },
]

export const NAV_SECONDARY: NavItem[] = [
  { title: "Settings", url: "/dashboard/settings", icon: Settings2 },
]

const ALL = [...NAV_MAIN, ...NAV_SECONDARY]

/** Title for the current route: exact match first, otherwise the longest route that prefixes it. */
export function pageTitle(pathname: string): string {
  const exact = ALL.find((i) => i.url === pathname)
  if (exact) return exact.title
  let best: NavItem | undefined
  for (const item of ALL) {
    if (item.url === "/dashboard") continue
    if (pathname.startsWith(`${item.url}/`) && (!best || item.url.length > best.url.length)) best = item
  }
  return best?.title ?? "Dashboard"
}
