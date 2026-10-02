"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useEffect, useState } from "react"

interface HeroPnlProps {
    totalPnl: number
    totalTrades: number
    winRate: number
}

export function HeroPnl({ totalPnl, totalTrades, winRate }: HeroPnlProps) {
    const [displayValue, setDisplayValue] = useState(0)
    const isProfit = totalPnl >= 0

    // Count-up animation
    useEffect(() => {
        const duration = 1500
        const steps = 60
        const increment = totalPnl / steps
        let current = 0
        let step = 0

        const timer = setInterval(() => {
            step++
            current += increment
            if (step >= steps) {
                setDisplayValue(totalPnl)
                clearInterval(timer)
            } else {
                setDisplayValue(Math.round(current))
            }
        }, duration / steps)

        return () => clearInterval(timer)
    }, [totalPnl])

    return (
        <Card className="p-6 glass-card relative overflow-hidden group h-full">
            {/* Background glow */}
            <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20 ${isProfit ? "bg-[var(--success)]" : "bg-[var(--destructive)]"}`}></div>

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Portfolio P&L</p>
                    <div className="flex items-baseline gap-3">
                        <h2 className={`text-4xl md:text-5xl font-bold tracking-tight ${isProfit ? "text-[var(--success)] dark:text-[var(--success)]" : "text-[var(--destructive)] dark:text-[var(--destructive)]"}`}>
                            {isProfit ? "+" : ""}₹{displayValue.toLocaleString("en-IN")}
                        </h2>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isProfit ? "bg-[var(--success)]/10 text-[var(--success)] dark:text-[var(--success)]" : "bg-[var(--destructive)]/10 text-[var(--destructive)] dark:text-[var(--destructive)]"}`}>
                            {isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                            {winRate}% WR
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 mt-6">
                    <div>
                        <p className="text-2xl font-bold text-foreground">{totalTrades}</p>
                        <p className="text-xs text-muted-foreground">Total Trades</p>
                    </div>
                    <div className="h-8 w-px bg-border"></div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">{winRate}%</p>
                        <p className="text-xs text-muted-foreground">Win Rate</p>
                    </div>
                </div>
            </div>
        </Card>
    )
}
