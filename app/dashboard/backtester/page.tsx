"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import {
    FlaskConical, TrendingUp, TrendingDown, BarChart3,
    CheckCircle2, XCircle, Target, Loader2,
} from "lucide-react"
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, Legend, Cell,
} from "recharts"

/* ─── Colors for strategies ─── */
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

export default function BacktesterPage() {
    const [trades, setTrades] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    useEffect(() => {
        setIsLoading(true)
        fetch("/api/trades")
            .then(res => res.json())
            .then(data => { setTrades(data); setIsLoading(false) })
            .catch(() => setIsLoading(false))
    }, [])

    // ── Extract all strategies ──
    const allStrategies = useMemo(() => {
        const set = new Set<string>()
        trades.forEach(t => { if (t.strategy) set.add(t.strategy) })
        return Array.from(set).sort()
    }, [trades])

    // Auto-select all strategies on first load
    useEffect(() => {
        if (allStrategies.length > 0 && selected.size === 0) {
            setSelected(new Set(allStrategies))
        }
    }, [allStrategies])

    const toggleStrategy = (s: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(s)) next.delete(s)
            else next.add(s)
            return next
        })
    }

    const selectAll = () => setSelected(new Set(allStrategies))
    const clearAll = () => setSelected(new Set())

    // ── Compute strategy stats ──
    const strategyStats = useMemo(() => {
        const map: Record<string, {
            pnl: number; count: number; wins: number; losses: number;
            avgPnl: number; maxWin: number; maxLoss: number;
            trades: { date: string; pnl: number }[]
        }> = {}

        trades.forEach(t => {
            if (!t.strategy || !selected.has(t.strategy)) return
            if (!map[t.strategy]) {
                map[t.strategy] = { pnl: 0, count: 0, wins: 0, losses: 0, avgPnl: 0, maxWin: 0, maxLoss: 0, trades: [] }
            }
            const s = map[t.strategy]
            s.pnl += t.pnl
            s.count++
            if (t.pnl > 0) { s.wins++; s.maxWin = Math.max(s.maxWin, t.pnl) }
            else { s.losses++; s.maxLoss = Math.min(s.maxLoss, t.pnl) }
            s.trades.push({ date: t.date, pnl: t.pnl })
        })

        Object.values(map).forEach(s => { s.avgPnl = s.count > 0 ? Math.round(s.pnl / s.count) : 0 })
        return map
    }, [trades, selected])

    // ── Chart data ──
    const pnlChartData = useMemo(() =>
        Object.entries(strategyStats)
            .map(([name, s]) => ({ name, pnl: Math.round(s.pnl), fill: s.pnl >= 0 ? "#10b981" : "#ef4444" }))
            .sort((a, b) => b.pnl - a.pnl),
        [strategyStats]
    )

    const winRateChartData = useMemo(() =>
        Object.entries(strategyStats)
            .map(([name, s]) => ({ name, winRate: s.count > 0 ? Math.round((s.wins / s.count) * 100) : 0 }))
            .sort((a, b) => b.winRate - a.winRate),
        [strategyStats]
    )

    const avgPnlChartData = useMemo(() =>
        Object.entries(strategyStats)
            .map(([name, s]) => ({ name, avgPnl: s.avgPnl, fill: s.avgPnl >= 0 ? "#6366f1" : "#ef4444" }))
            .sort((a, b) => b.avgPnl - a.avgPnl),
        [strategyStats]
    )

    // ── Cumulative P&L line chart ──
    const cumulativeData = useMemo(() => {
        if (selected.size === 0) return []

        // Get all trades for selected strategies, sorted by date
        const allTrades = trades
            .filter(t => t.strategy && selected.has(t.strategy))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Group by date
        const dateMap: Record<string, Record<string, number>> = {}
        const cumulative: Record<string, number> = {}
        selected.forEach(s => { cumulative[s] = 0 })

        allTrades.forEach(t => {
            const dateKey = new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
            if (!dateMap[dateKey]) dateMap[dateKey] = {}
            cumulative[t.strategy] = (cumulative[t.strategy] || 0) + t.pnl
            dateMap[dateKey][t.strategy] = cumulative[t.strategy]
        })

        // Build array
        const result: any[] = []
        let prev: Record<string, number> = {}
        selected.forEach(s => { prev[s] = 0 })

        Object.entries(dateMap).forEach(([date, strats]) => {
            const point: any = { date }
            selected.forEach(s => {
                point[s] = Math.round(strats[s] ?? prev[s] ?? 0)
                if (strats[s] !== undefined) prev[s] = strats[s]
            })
            result.push(point)
        })

        return result
    }, [trades, selected])

    if (isLoading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div><h1 className="font-display text-3xl tracking-tight text-foreground flex items-center gap-3"><FlaskConical className="h-8 w-8 text-indigo-400" /> Strategy Backtester</h1></div>
                <Card className="relative overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-15 bg-indigo-500 animate-pulse" />
                    <div className="relative z-10 flex flex-col items-center py-24">
                        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
                        <p className="text-lg font-semibold text-foreground">Loading your trades...</p>
                    </div>
                </Card>
            </div>
        )
    }

    if (trades.length === 0) {
        return (
            <div className="space-y-6">
                <div><h1 className="font-display text-3xl tracking-tight text-foreground flex items-center gap-3"><FlaskConical className="h-8 w-8 text-indigo-400" /> Strategy Backtester</h1></div>
                <Card className="p-8 text-center">
                    <FlaskConical className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">Add some trades first to compare strategies.</p>
                </Card>
            </div>
        )
    }

    const selectedArr = Array.from(selected)

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-1 flex items-center gap-3">
                    <FlaskConical className="h-8 w-8 text-indigo-400" /> Strategy Backtester
                </h1>
                <p className="text-sm text-muted-foreground">Compare your strategies head-to-head with data</p>
            </div>

            {/* Strategy Selector */}
            <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Strategies to Compare</h4>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">Select All</Button>
                        <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7">Clear</Button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {allStrategies.map((s, i) => (
                        <button
                            key={s}
                            onClick={() => toggleStrategy(s)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                                selected.has(s)
                                    ? "border-primary/30 bg-primary/10 text-foreground"
                                    : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                            )}
                        >
                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {s}
                        </button>
                    ))}
                </div>
            </Card>

            {selected.size === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Select at least one strategy to see comparisons.</p>
                </Card>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {selectedArr.map((s, i) => {
                            const stat = strategyStats[s]
                            if (!stat) return null
                            const winRate = stat.count > 0 ? Math.round((stat.wins / stat.count) * 100) : 0
                            return (
                                <Card key={s} className="p-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 rounded-t-lg" style={{ backgroundColor: COLORS[allStrategies.indexOf(s) % COLORS.length] }} />
                                    <h4 className="text-sm font-bold text-foreground mb-2">{s}</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <p className="text-muted-foreground">Total P&L</p>
                                            <p className={cn("font-bold text-base", stat.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {stat.pnl >= 0 ? "+" : ""}₹{stat.pnl.toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Win Rate</p>
                                            <p className="font-bold text-base text-foreground">{winRate}%</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Trades</p>
                                            <p className="font-bold text-foreground">{stat.count}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Avg P&L</p>
                                            <p className={cn("font-bold", stat.avgPnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                ₹{stat.avgPnl.toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Charts Grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Total P&L Bar Chart */}
                        <Card className="p-5">
                            <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <BarChart3 className="h-3.5 w-3.5" /> Total P&L by Strategy
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={pnlChartData} layout="vertical">
                                    <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(v) => "₹" + v.toLocaleString("en-IN")} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={100} />
                                    <Tooltip
                                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", fontSize: "12px", color: "var(--foreground)" }}
                                        labelStyle={{ color: "var(--foreground)" }}
                                        itemStyle={{ color: "var(--foreground)" }}
                                        formatter={(v: number) => ["₹" + v.toLocaleString("en-IN"), "P&L"]}
                                    />
                                    <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                                        {pnlChartData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.fill} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Win Rate Bar Chart */}
                        <Card className="p-5">
                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5" /> Win Rate by Strategy
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={winRateChartData} layout="vertical">
                                    <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(v) => v + "%"} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={100} />
                                    <Tooltip
                                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", fontSize: "12px", color: "var(--foreground)" }}
                                        labelStyle={{ color: "var(--foreground)" }}
                                        itemStyle={{ color: "var(--foreground)" }}
                                        formatter={(v: number) => [v + "%", "Win Rate"]}
                                    />
                                    <Bar dataKey="winRate" fill="#6366f1" fillOpacity={0.7} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Avg P&L Chart */}
                        <Card className="p-5">
                            <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" /> Avg P&L Per Trade
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={avgPnlChartData} layout="vertical">
                                    <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(v) => "₹" + v.toLocaleString("en-IN")} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={100} />
                                    <Tooltip
                                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", fontSize: "12px", color: "var(--foreground)" }}
                                        labelStyle={{ color: "var(--foreground)" }}
                                        itemStyle={{ color: "var(--foreground)" }}
                                        formatter={(v: number) => ["₹" + v.toLocaleString("en-IN"), "Avg P&L"]}
                                    />
                                    <Bar dataKey="avgPnl" radius={[0, 4, 4, 0]}>
                                        {avgPnlChartData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.fill} fillOpacity={0.8} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Cumulative P&L Line Chart */}
                        <Card className="p-5">
                            <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" /> Cumulative P&L Over Time
                            </h4>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={cumulativeData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--muted-foreground)" strokeOpacity={0.1} />
                                    <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} />
                                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(v) => "₹" + v.toLocaleString("en-IN")} />
                                    <Tooltip
                                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "0.75rem", fontSize: "12px", color: "var(--foreground)" }}
                                        labelStyle={{ color: "var(--foreground)" }}
                                        itemStyle={{ color: "var(--foreground)" }}
                                        formatter={(v: number, name: string) => ["₹" + v.toLocaleString("en-IN"), name]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "11px", color: "var(--foreground)" }} />
                                    {selectedArr.map((s, i) => (
                                        <Line
                                            key={s}
                                            type="monotone"
                                            dataKey={s}
                                            stroke={COLORS[allStrategies.indexOf(s) % COLORS.length]}
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* Detailed Table */}
                    <Card className="p-5 overflow-x-auto">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Detailed Comparison</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-xs text-muted-foreground">
                                    <th className="text-left py-2 px-3">Strategy</th>
                                    <th className="text-right py-2 px-3">Trades</th>
                                    <th className="text-right py-2 px-3">Wins</th>
                                    <th className="text-right py-2 px-3">Losses</th>
                                    <th className="text-right py-2 px-3">Win Rate</th>
                                    <th className="text-right py-2 px-3">Total P&L</th>
                                    <th className="text-right py-2 px-3">Avg P&L</th>
                                    <th className="text-right py-2 px-3">Best Trade</th>
                                    <th className="text-right py-2 px-3">Worst Trade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedArr.map((s, i) => {
                                    const stat = strategyStats[s]
                                    if (!stat) return null
                                    const winRate = stat.count > 0 ? Math.round((stat.wins / stat.count) * 100) : 0
                                    return (
                                        <tr key={s} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                            <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[allStrategies.indexOf(s) % COLORS.length] }} />
                                                {s}
                                            </td>
                                            <td className="text-right py-2.5 px-3">{stat.count}</td>
                                            <td className="text-right py-2.5 px-3 text-emerald-500">{stat.wins}</td>
                                            <td className="text-right py-2.5 px-3 text-rose-500">{stat.losses}</td>
                                            <td className="text-right py-2.5 px-3 font-medium">{winRate}%</td>
                                            <td className={cn("text-right py-2.5 px-3 font-bold", stat.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                {stat.pnl >= 0 ? "+" : ""}₹{stat.pnl.toLocaleString("en-IN")}
                                            </td>
                                            <td className={cn("text-right py-2.5 px-3", stat.avgPnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                ₹{stat.avgPnl.toLocaleString("en-IN")}
                                            </td>
                                            <td className="text-right py-2.5 px-3 text-emerald-500">+₹{stat.maxWin.toLocaleString("en-IN")}</td>
                                            <td className="text-right py-2.5 px-3 text-rose-500">₹{stat.maxLoss.toLocaleString("en-IN")}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </Card>
                </>
            )}
        </div>
    )
}
