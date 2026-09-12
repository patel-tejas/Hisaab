"use client"

import type * as React from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  ArrowLeftRight,
  Calendar,
  BarChart3,
  Brain,
  Link2,
  CalendarClock,
  FlaskConical,
  Sparkles,
  Settings2,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Trades", url: "/dashboard/trades", icon: ArrowLeftRight },
  { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
  { title: "Analytics", url: "/dashboard/reports", icon: BarChart3 },
  { title: "AI Insights", url: "/dashboard/ai-insights", icon: Brain },
  { title: "Brokers", url: "/dashboard/broker", icon: Link2 },
  { title: "Daily Planner", url: "/dashboard/planner", icon: CalendarClock },
  { title: "Backtester", url: "/dashboard/backtester", icon: FlaskConical },
  { title: "Eve Agent", url: "/agent", icon: Sparkles },
]

const navSecondary = [
  { title: "Settings", url: "/dashboard/settings", icon: Settings2 },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="gap-0 px-3 pt-3 pb-2">
        <Link
          href="/dashboard"
          className="flex h-10 items-center gap-2.5 rounded-lg px-1 outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent focus-visible:ring-2"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
            H
          </div>
          <span className="truncate font-display text-[1.65rem] leading-none tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Hisaab
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <SidebarSeparator className="mx-0" />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
