"use client"

import type React from "react"
import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { AddTradeModal } from "@/components/add-trade-modal"
import { AuthProvider } from "@/lib/auth-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false)

  return (
    <SidebarProvider className="h-svh max-h-svh min-h-0 overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-svh max-h-svh min-h-0 overflow-hidden md:h-[calc(100svh-1rem)] md:max-h-[calc(100svh-1rem)]">
        <Header onNewTrade={() => setIsAddTradeOpen(true)} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="animate-in fade-in slide-in-from-bottom-4 p-4 duration-700 md:p-6">
            {children}
          </div>
        </div>
      </SidebarInset>
      <AddTradeModal open={isAddTradeOpen} onOpenChange={setIsAddTradeOpen} />
    </SidebarProvider>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="h-svh max-h-svh overflow-hidden bg-background text-foreground selection:bg-primary/30 font-sans">
        <DashboardContent>{children}</DashboardContent>
      </div>
    </AuthProvider>
  )
}
