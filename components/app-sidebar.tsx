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
  Blocks,
} from "lucide-react"

import { BrandMark } from "@/components/brand-mark"
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
  { title: "Eve Agent", url: "/dashboard/agent", icon: Sparkles },
  { title: "Strategies", url: "/dashboard/strategies", icon: Blocks },
]

const navSecondary = [
  { title: "Settings", url: "/dashboard/settings", icon: Settings2 },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="gap-0 px-3 pb-3 pt-4">
        <Link
          href="/dashboard"
          className="magnetic flex items-center gap-3 rounded-xl px-1.5 py-1 outline-none ring-sidebar-ring hover:bg-sidebar-accent focus-visible:ring-2"
          aria-label="Hisaab home"
        >
          <BrandMark size={34} />
          <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate font-display text-2xl leading-none tracking-tight text-foreground">
              Hisaab
            </span>
            <span className="label-mono mt-1 text-[9px] tracking-[0.18em]">
              Trading journal
            </span>
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
