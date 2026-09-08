"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
    CalendarDays,
    Clock,
    Lightbulb,
    TrendingUp,
    TrendingDown,
    BarChart3,
} from "lucide-react"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
} from "recharts"

interface InsightStat {
    pnl: number
    count: number
    winRate: number
}

interface DayStat extends InsightStat {
    day: string
}

interface HourStat extends InsightStat {
    hour: string
}

interface StrategyStat extends InsightStat {
    strategy: string
}

interface TradingInsightsProps {
    insights: {
        bestDay: DayStat | null
        worstDay: DayStat | null
        bestTime: HourStat | null
        worstTime: HourStat | null
        bestStrategy: StrategyStat | null
        dayStats: DayStat[]
        hourStats: HourStat[]
    }
}

function InsightTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
            <p className="text-muted-foreground text-xs mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="font-semibold" style={{ color: p.color }}>
                    {p.name}: ₹{typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}
                </p>
            ))}
        </div>
    )
}

export function TradingInsights({ insights }: TradingInsightsProps) {
    const { bestDay, worstDay, bestTime, worstTime, bestStrategy, dayStats, hourStats } = insights

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground text-lg">Trading Insights</h3>
                    <p className="text-xs text-muted-foreground">Patterns from your trade history</p>
                </div>
            </div>

            {/* Insight Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Best Day */}
                <Card className="p-5 glass-card relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 bg-emerald-500" />
                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <CalendarDays className="h-5 w-5" /> Best Day
                            </p>
                            {bestDay ? (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{bestDay.day}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-emerald-500 font-semibold text-sm">
                                            +₹{bestDay.pnl.toLocaleString("en-IN")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {bestDay.winRate}% WR • {bestDay.count} trades
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground mt-1">Not enough data</p>
                            )}
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                    </div>

                    {worstDay && worstDay.day !== bestDay?.day && (
                        <div className="mt-3 pt-3 border-t border-border/50 relative z-10">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <TrendingDown className="h-5 w-5 text-rose-400" /> Worst: {worstDay.day}
                                </span>
                                <span className="text-rose-500 font-medium">
                                    ₹{worstDay.pnl.toLocaleString("en-IN")}
                                </span>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Best Time */}
                <Card className="p-5 glass-card relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 bg-indigo-500" />
                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="h-5 w-5" /> Best Time
                            </p>
                            {bestTime ? (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{bestTime.hour}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-emerald-500 font-semibold text-sm">
                                            +₹{bestTime.pnl.toLocaleString("en-IN")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {bestTime.winRate}% WR • {bestTime.count} trades
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground mt-1">Add entry times to see</p>
                            )}
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Clock className="h-5 w-5 text-indigo-400" />
                        </div>
                    </div>

                    {worstTime && worstTime.hour !== bestTime?.hour && (
                        <div className="mt-3 pt-3 border-t border-border/50 relative z-10">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <TrendingDown className="h-5 w-5 text-rose-400" /> Worst: {worstTime.hour}
                                </span>
                                <span className="text-rose-500 font-medium">
                                    ₹{worstTime.pnl.toLocaleString("en-IN")}
                                </span>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Best Strategy */}
                <Card className="p-5 glass-card relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 bg-violet-500" />
                    <div className="flex items-start justify-between relative z-10">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <BarChart3 className="h-5 w-5" /> Best Strategy
                            </p>
                            {bestStrategy ? (
                                <>
                                    <p className="text-2xl font-bold text-foreground">{bestStrategy.strategy}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={cn("font-semibold text-sm", bestStrategy.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                            {bestStrategy.pnl >= 0 ? "+" : ""}₹{bestStrategy.pnl.toLocaleString("en-IN")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {bestStrategy.winRate}% WR • {bestStrategy.count} trades
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground mt-1">Not enough data</p>
                            )}
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            <BarChart3 className="h-5 w-5 text-violet-400" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Mini Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Day of Week Chart */}
                {dayStats.length > 0 && (
                    <Card className="p-5 glass-card">
                        <h4 className="text-sm font-semibold text-foreground mb-3">P&L by Day of Week</h4>
                        <div className="h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dayStats}>
                                    <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.substring(0, 3)} />
                                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                    <Tooltip content={<InsightTooltip />} />
                                    <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                                        {dayStats.map((entry, i) => (
                                            <Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}

                {/* Time of Day Chart */}
                {hourStats.length > 0 && (
                    <Card className="p-5 glass-card">
                        <h4 className="text-sm font-semibold text-foreground mb-3">P&L by Time of Day</h4>
                        <div className="h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourStats}>
                                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                    <Tooltip content={<InsightTooltip />} />
                                    <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                                        {hourStats.map((entry, i) => (
                                            <Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#f43f5e"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}
