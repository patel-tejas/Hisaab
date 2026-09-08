"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, Minus } from "lucide-react"

interface MonthData {
    pnl: number
    trades: number
    winRate: number
}

interface MonthlyComparisonProps {
    comparison: {
        thisMonth: MonthData
        lastMonth: MonthData
        pnlChange: number
    }
}

function StatRow({
    label,
    thisMonth,
    lastMonth,
    format: fmt = "number",
}: {
    label: string
    thisMonth: number
    lastMonth: number
    format?: "currency" | "percent" | "number"
}) {
    const diff = thisMonth - lastMonth
    const isUp = diff > 0
    const isNeutral = diff === 0

    const formatVal = (v: number) => {
        if (fmt === "currency") return `₹${v.toLocaleString("en-IN")}`
        if (fmt === "percent") return `${v}%`
        return v.toString()
    }

    return (
        <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{formatVal(thisMonth)}</span>
                <span className="text-xs text-muted-foreground">vs {formatVal(lastMonth)}</span>
                {isNeutral ? (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <span
                        className={cn(
                            "flex items-center gap-0.5 text-xs font-semibold rounded-full px-1.5 py-0.5",
                            isUp ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                        )}
                    >
                        {isUp ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                        {fmt === "percent" ? `${Math.abs(diff)}pp` : Math.abs(diff).toLocaleString("en-IN")}
                    </span>
                )}
            </div>
        </div>
    )
}

export function MonthlyComparison({ comparison }: MonthlyComparisonProps) {
    const { thisMonth, lastMonth, pnlChange } = comparison
    const isPositive = pnlChange > 0
    const thisMonthName = new Date().toLocaleString("en-IN", { month: "long" })
    const lastMonthDate = new Date()
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
    const lastMonthName = lastMonthDate.toLocaleString("en-IN", { month: "long" })

    return (
        <Card className="p-5 glass-card relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10 bg-blue-500" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Monthly Comparison</h3>
                        <p className="text-xs text-muted-foreground">
                            {thisMonthName} vs {lastMonthName}
                        </p>
                    </div>
                </div>
                <div
                    className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                        pnlChange === 0
                            ? "bg-muted text-muted-foreground"
                            : isPositive
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-rose-500/10 text-rose-500"
                    )}
                >
                    {isPositive ? (
                        <TrendingUp className="h-5 w-5" />
                    ) : pnlChange < 0 ? (
                        <ArrowDownRight className="h-5 w-5" />
                    ) : (
                        <Minus className="h-5 w-5" />
                    )}
                    {pnlChange > 0 ? "+" : ""}
                    {pnlChange}%
                </div>
            </div>

            <div className="relative z-10 divide-y divide-border/50">
                <StatRow label="P&L" thisMonth={thisMonth.pnl} lastMonth={lastMonth.pnl} format="currency" />
                <StatRow label="Trades" thisMonth={thisMonth.trades} lastMonth={lastMonth.trades} format="number" />
                <StatRow label="Win Rate" thisMonth={thisMonth.winRate} lastMonth={lastMonth.winRate} format="percent" />
            </div>
        </Card>
    )
}
