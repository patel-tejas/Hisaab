"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DayData {
    date: string
    pnl: number
}

interface CalendarHeatmapProps {
    data: DayData[]
}

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
    // Build a lookup map from the data
    const pnlMap = new Map<string, number>()
    data.forEach(d => pnlMap.set(d.date, d.pnl))

    // Generate last 12 weeks of dates (84 days)
    const today = new Date()
    const days: { date: string; pnl: number | null }[] = []
    for (let i = 83; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split("T")[0]
        days.push({ date: key, pnl: pnlMap.has(key) ? pnlMap.get(key)! : null })
    }

    // Group into weeks (columns)
    const weeks: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }

    const getColor = (pnl: number | null) => {
        if (pnl === null) return "bg-secondary/30"
        if (pnl > 5000) return "bg-emerald-500"
        if (pnl > 1000) return "bg-emerald-500/70"
        if (pnl > 0) return "bg-emerald-500/40"
        if (pnl === 0) return "bg-secondary/50"
        if (pnl > -1000) return "bg-rose-500/40"
        if (pnl > -5000) return "bg-rose-500/70"
        return "bg-rose-500"
    }

    const dayLabels = ["M", "", "W", "", "F", "", ""]

    return (
        <Card className="p-6 glass-card h-full flex flex-col">
            <div className="mb-4">
                <h3 className="font-semibold text-foreground">Trading Activity</h3>
                <p className="text-xs text-muted-foreground">Last 12 weeks</p>
            </div>

            <div className="flex-1 flex items-center overflow-hidden">
                <div className="flex gap-1 overflow-x-auto">
                    {/* Day labels */}
                    <div className="flex flex-col gap-1 mr-1">
                        {dayLabels.map((label, i) => (
                            <div key={i} className="h-3 w-3 flex items-center justify-center text-[8px] text-muted-foreground">
                                {label}
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-1">
                            {week.map((day, di) => (
                                <div
                                    key={di}
                                    title={`${day.date}: ${day.pnl !== null ? `₹${day.pnl.toLocaleString("en-IN")}` : "No trades"}`}
                                    className={cn(
                                        "h-3 w-3 rounded-sm transition-all duration-200 hover:scale-150 hover:ring-1 hover:ring-foreground/20 cursor-pointer",
                                        getColor(day.pnl)
                                    )}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground">
                <span>Loss</span>
                <div className="h-2.5 w-2.5 rounded-sm bg-rose-500"></div>
                <div className="h-2.5 w-2.5 rounded-sm bg-rose-500/40"></div>
                <div className="h-2.5 w-2.5 rounded-sm bg-secondary/30"></div>
                <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40"></div>
                <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500"></div>
                <span>Profit</span>
            </div>
        </Card>
    )
}
