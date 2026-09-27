"use client"

import { Card } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface TradeItem {
    symbol: string
    pnl: number
    pnlPercent: number
    direction?: string
    date?: string
}

interface RecentActivityProps {
    trades: TradeItem[]
}

export function RecentActivity({ trades }: RecentActivityProps) {
    const getTimeAgo = (dateStr?: string) => {
        if (!dateStr) return "Unknown"
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
        } catch {
            return "Unknown"
        }
    }

    return (
        <Card className="p-6 glass-card h-full flex flex-col">
            <div className="mb-5">
                <h3 className="font-semibold text-foreground text-lg">Recent Activity</h3>
                <p className="text-sm text-muted-foreground">Latest trades timeline</p>
            </div>

            <div className="flex-1 relative">
                <div className="space-y-5">
                    {trades.map((trade, index) => {
                        const isProfit = trade.pnl > 0
                        return (
                            <div key={index} className="flex items-start gap-4 relative">
                                {/* Timeline line segment */}
                                {index < trades.length - 1 && (
                                    <div className="absolute left-[15px] top-[30px] bottom-[-20px] w-px bg-border z-0"></div>
                                )}

                                {/* Timeline dot */}
                                <div className={`relative z-10 h-[30px] w-[30px] shrink-0 rounded-full flex items-center justify-center ${isProfit ? "bg-[var(--success)]/10" : "bg-[var(--destructive)]/10"}`}>
                                    {isProfit
                                        ? <ArrowUpRight className="h-5 w-5 text-[var(--success)]" />
                                        : <ArrowDownRight className="h-5 w-5 text-[var(--destructive)]" />
                                    }
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground text-sm">{trade.symbol}</span>
                                            {trade.direction && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${trade.direction === "long" ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "bg-[var(--warning)]/20 text-[var(--warning)]"}`}>
                                                    {trade.direction.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-sm font-semibold ${isProfit ? "text-[var(--success)] dark:text-[var(--success)]" : "text-[var(--destructive)] dark:text-[var(--destructive)]"}`}>
                                            {isProfit ? "+" : ""}₹{trade.pnl.toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                        <Clock className="h-5 w-5" />
                                        {getTimeAgo(trade.date)}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Card>
    )
}
