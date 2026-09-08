"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { AlertTriangle, Flame, Clock, Zap } from "lucide-react"

interface RevengeTradeData {
    trade: { symbol: string; date: string; pnl: number; entryTime: string }
    afterLoss: { symbol: string; pnl: number }
    gapMinutes: number
    severity: "high" | "medium" | "low"
}

interface RevengeTradesProps {
    trades: RevengeTradeData[]
    totalTrades: number
}

export function RevengeTrades({ trades, totalTrades }: RevengeTradesProps) {
    const count = trades.length
    const ratio = totalTrades > 0 ? Math.round((count / totalTrades) * 100) : 0
    const totalRevengePnl = trades.reduce((s, t) => s + t.trade.pnl, 0)
    const highCount = trades.filter((t) => t.severity === "high").length

    const getSeverityColor = (s: string) => {
        if (s === "high") return "text-rose-500 bg-rose-500/10 border-rose-500/20"
        if (s === "medium") return "text-amber-500 bg-amber-500/10 border-amber-500/20"
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
    }

    const getSeverityIcon = (s: string) => {
        if (s === "high") return <Flame className="h-5 w-5" />
        if (s === "medium") return <Zap className="h-5 w-5" />
        return <Clock className="h-5 w-5" />
    }

    return (
        <Card className="p-5 glass-card relative overflow-hidden">
            <div
                className={cn(
                    "absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-10",
                    count > 0 ? "bg-rose-500" : "bg-emerald-500"
                )}
            />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            count > 0 ? "bg-rose-500/10" : "bg-emerald-500/10"
                        )}
                    >
                        <AlertTriangle
                            className={cn("h-5 w-5", count > 0 ? "text-rose-500" : "text-emerald-500")}
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Revenge Trades</h3>
                        <p className="text-xs text-muted-foreground">Trades within 30min of a loss</p>
                    </div>
                </div>

                {count > 0 && (
                    <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">
                        {count} detected
                    </span>
                )}
            </div>

            <div className="relative z-10">
                {count === 0 ? (
                    <div className="text-center py-4">
                        <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <span className="text-lg">🎯</span>
                        </div>
                        <p className="text-sm font-semibold text-emerald-500">No revenge trades detected!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Great discipline — you're trading with a clear head.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="bg-muted/40 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-foreground">{count}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Revenge
                                </p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-rose-500">
                                    {totalRevengePnl >= 0 ? "+" : ""}₹
                                    {Math.abs(totalRevengePnl).toLocaleString("en-IN")}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Impact
                                </p>
                            </div>
                            <div className="bg-muted/40 rounded-lg p-2 text-center">
                                <p className="text-lg font-bold text-foreground">{ratio}%</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    of Trades
                                </p>
                            </div>
                        </div>

                        {/* Individual revenge trades */}
                        <div className="space-y-1.5 max-h-[180px] overflow-auto">
                            {trades.slice(0, 5).map((rt, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/20 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                                getSeverityColor(rt.severity)
                                            )}
                                        >
                                            {getSeverityIcon(rt.severity)}
                                            {rt.severity}
                                        </span>
                                        <div>
                                            <span className="text-sm font-semibold text-foreground">
                                                {rt.trade.symbol}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-1.5">
                                                {rt.gapMinutes}min after loss on {rt.afterLoss.symbol}
                                            </span>
                                        </div>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-sm font-semibold",
                                            rt.trade.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                                        )}
                                    >
                                        {rt.trade.pnl >= 0 ? "+" : ""}₹
                                        {Math.abs(rt.trade.pnl).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {highCount > 0 && (
                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
                                <p className="text-xs text-rose-400">
                                    ⚠️ {highCount} trade{highCount > 1 ? "s" : ""} taken within 5 minutes of a loss.
                                    Consider adding a cooldown timer to your routine.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    )
}
