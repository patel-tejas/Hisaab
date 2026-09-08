"use client"

import { Card } from "@/components/ui/card"
import { Plus, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface QuickActionsProps {
    onNewTrade?: () => void
}

export function QuickActions({ onNewTrade }: QuickActionsProps) {
    return (
        <Card className="p-6 glass-card h-full flex flex-col justify-between">
            <div>
                <h3 className="font-semibold text-foreground text-lg mb-1">Quick Actions</h3>
                <p className="text-xs text-muted-foreground mb-4">Jump into your workflow</p>
            </div>
            <div className="space-y-3">
                <Button
                    onClick={onNewTrade}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 h-11 transition-all hover:scale-[1.02]"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Trade
                </Button>
                <Button variant="outline" asChild className="w-full rounded-xl h-11 border-border hover:bg-muted">
                    <Link href="/dashboard/reports">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        View Analytics
                    </Link>
                </Button>
            </div>
        </Card>
    )
}
