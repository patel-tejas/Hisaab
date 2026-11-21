"use client"

import type * as React from "react"
import Link from "next/link"
import { BrandMark } from "@/components/brand-mark"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NAV_MAIN, NAV_SECONDARY } from "@/lib/nav"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar"

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
        <NavMain items={NAV_MAIN} />
        <SidebarSeparator className="mx-0" />
        <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
