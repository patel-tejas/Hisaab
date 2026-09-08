"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState, useEffect, useCallback } from "react"
import {
    CalendarClock, RefreshCw, Loader2, Target, Brain, Shield,
    Clock, Zap, AlertTriangle, TrendingUp, Flame, Eye,
    CheckCircle2, XCircle, Sparkles, ArrowUpRight,
} from "lucide-react"

/* ─── Types ─── */
interface PlannerData {
    ready: boolean
    greeting?: string
    focusStrategy?: { name: string; reason: string; winRate: string; avgPnl: number }
    avoidStrategy?: { name: string; reason: string }
    tradeLimit?: { max: number; reason: string }
    confidenceThreshold?: { min: number; reason: string }
    bestTimeWindows?: { time: string; reason: string }[]
    emotionalAdvice?: { watchFor: string; tip: string }
    keyRules?: string[]
    streakAdvice?: string
    marketFocus?: string
    summary?: string
    parseError?: boolean
}

/* ─── Cache ─── */
const CACHE_KEY = "ai-planner-cache"
const CACHE_TTL = 1000 * 60 * 60 * 12 // 12 hours

function getCached(): PlannerData | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const { data, timestamp, day } = JSON.parse(raw)
        // Invalidate if different day or expired
        if (day !== new Date().toDateString() || Date.now() - timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY)
            return null
        }
        return data
    } catch { return null }
}

function setCache(data: PlannerData) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now(), day: new Date().toDateString() }))
}

/* ─── Section Card ─── */
function PlanCard({ icon: Icon, title, color, children, className }: {
    icon: any; title: string; color: string; children: React.ReactNode; className?: string
}) {
    return (
        <Card className={cn("p-5 relative overflow-hidden group hover:border-primary/20 transition-colors", className)}>
            <div className={cn("absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-[.07]", `bg-${color}-500`)} />
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", `bg-${color}-500/10`)}>
                        <Icon className={cn("h-5 w-5", `text-${color}-400`)} />
                    </div>
                    <h4 className={cn("text-xs font-bold uppercase tracking-wider", `text-${color}-400`)}>{title}</h4>
                </div>
                {children}
            </div>
        </Card>
    )
}

/* ════════════════════════════════════ MAIN PAGE ════════════════════════════════════ */
export default function DailyPlannerPage() {
    const [data, setData] = useState<PlannerData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => { const c = getCached(); if (c?.ready) setData(c) }, [])

    const fetchPlan = useCallback(async () => {
        setLoading(true); setError("")
        try {
            const res = await fetch("/api/ai-planner")
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.details || e.error || "Failed") }
            const json = await res.json()
            setData(json); if (json.ready) setCache(json)
        } catch (err: any) { setError(err.message || "Failed to generate plan.") }
        finally { setLoading(false) }
    }, [])

    const todayName = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

    /* ─── Empty State ─── */
    if (!data && !loading && !error) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div>
                    <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-2 flex items-center gap-3">
                        <CalendarClock className="h-8 w-8 text-amber-400" /> Daily Planner
                    </h1>
                    <p className="text-muted-foreground">{todayName}</p>
                </div>
                <Card className="relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-10 bg-amber-500 animate-pulse" />
                        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-10 bg-orange-500 animate-pulse" style={{ animationDelay: "1s" }} />
                    </div>
                    <div className="relative z-10 flex flex-col items-center justify-center py-20 px-8 text-center">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 mb-6">
                            <CalendarClock className="h-10 w-10 text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-3">Your AI Game Plan</h2>
                        <p className="text-muted-foreground max-w-lg mb-8 leading-relaxed">
                            Get a personalized daily trading plan based on your historical patterns —
                            best strategies, optimal trade count, time windows, and emotional guidance.
                        </p>
                        <Button size="lg" onClick={fetchPlan} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 px-8">
                            <Sparkles className="h-5 w-5 mr-2" /> Generate Today&apos;s Plan
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">Cached for the day • Refreshes daily</p>
                    </div>
                </Card>
            </div>
        )
    }

    /* ─── Loading ─── */
    if (loading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div><h1 className="font-display text-3xl tracking-tight text-foreground flex items-center gap-3"><CalendarClock className="h-8 w-8 text-amber-400" /> Daily Planner</h1></div>
                <Card className="relative overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-15 bg-amber-500 animate-pulse" />
                    <div className="relative z-10 flex flex-col items-center py-24">
                        <Loader2 className="h-10 w-10 text-amber-400 animate-spin mb-4" />
                        <p className="text-lg font-semibold text-foreground mb-1">Building your game plan...</p>
                        <p className="text-sm text-muted-foreground">Analyzing patterns for {new Date().toLocaleDateString("en-IN", { weekday: "long" })}</p>
                        <div className="flex gap-1 mt-5">{[0, 1, 2, 3, 4].map(i => <div key={i} className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: i * .2 + "s" }} />)}</div>
                    </div>
                </Card>
            </div>
        )
    }

    /* ─── Error ─── */
    if (error) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div><h1 className="font-display text-3xl tracking-tight text-foreground flex items-center gap-3"><CalendarClock className="h-8 w-8 text-amber-400" /> Daily Planner</h1></div>
                <Card className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-2">Failed to generate plan</p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">{error}</p>
                    <Button onClick={fetchPlan} variant="outline"><RefreshCw className="h-5 w-5 mr-2" /> Retry</Button>
                </Card>
            </div>
        )
    }

    if (!data?.ready) {
        return (
            <div className="space-y-6"><Card className="p-8 text-center"><CalendarClock className="h-12 w-12 text-amber-400 mx-auto mb-4" /><p className="text-muted-foreground">{data?.summary}</p></Card></div>
        )
    }

    /* ═══════════════════════ Full Plan View ═══════════════════════ */
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-3xl md:text-4xl tracking-tight text-foreground mb-1 flex items-center gap-3">
                        <CalendarClock className="h-8 w-8 text-amber-400" /> Daily Planner
                    </h1>
                    <p className="text-sm text-muted-foreground">{todayName}</p>
                </div>
                <Button variant="outline" onClick={fetchPlan} disabled={loading} className="gap-2">
                    <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} /> Refresh
                </Button>
            </div>

            {/* Greeting Banner */}
            {data.greeting && (
                <Card className="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border-amber-500/20">
                    <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-400" /> {data.greeting}
                    </p>
                </Card>
            )}

            {/* Row 1: Focus + Avoid Strategy */}
            <div className="grid gap-6 md:grid-cols-2">
                {data.focusStrategy && (
                    <PlanCard icon={Target} title="Focus Strategy" color="emerald">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl font-bold text-foreground">{data.focusStrategy.name}</span>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{data.focusStrategy.winRate} WR</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{data.focusStrategy.reason}</p>
                        {data.focusStrategy.avgPnl !== 0 && (
                            <p className="text-xs text-muted-foreground mt-2">Avg P&L: <span className={cn("font-bold", data.focusStrategy.avgPnl > 0 ? "text-emerald-400" : "text-rose-400")}>₹{data.focusStrategy.avgPnl.toLocaleString("en-IN")}</span></p>
                        )}
                    </PlanCard>
                )}
                {data.avoidStrategy && (
                    <PlanCard icon={XCircle} title="Avoid Today" color="rose">
                        <p className="text-lg font-bold text-foreground mb-2">{data.avoidStrategy.name}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{data.avoidStrategy.reason}</p>
                    </PlanCard>
                )}
            </div>

            {/* Row 2: Trade Limit + Confidence + Time Windows */}
            <div className="grid gap-6 md:grid-cols-3">
                {data.tradeLimit && (
                    <PlanCard icon={Shield} title="Trade Limit" color="blue">
                        <p className="text-4xl font-bold text-foreground mb-1">{data.tradeLimit.max}</p>
                        <p className="text-xs text-muted-foreground">max trades today</p>
                        <p className="text-xs text-muted-foreground mt-2 italic">{data.tradeLimit.reason}</p>
                    </PlanCard>
                )}
                {data.confidenceThreshold && (
                    <PlanCard icon={Zap} title="Min Confidence" color="indigo">
                        <p className="text-4xl font-bold text-foreground mb-1">{data.confidenceThreshold.min}<span className="text-lg text-muted-foreground">/5</span></p>
                        <p className="text-xs text-muted-foreground">minimum entry confidence</p>
                        <p className="text-xs text-muted-foreground mt-2 italic">{data.confidenceThreshold.reason}</p>
                    </PlanCard>
                )}
                {data.bestTimeWindows && data.bestTimeWindows.length > 0 && (
                    <PlanCard icon={Clock} title="Best Time Windows" color="violet">
                        <div className="space-y-2">
                            {data.bestTimeWindows.map((tw, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-sm font-bold text-foreground shrink-0">{tw.time}</span>
                                    <span className="text-xs text-muted-foreground">{tw.reason}</span>
                                </div>
                            ))}
                        </div>
                    </PlanCard>
                )}
            </div>

            {/* Row 3: Emotional + Streak */}
            <div className="grid gap-6 md:grid-cols-2">
                {data.emotionalAdvice && (
                    <PlanCard icon={Brain} title="Emotional Guidance" color="pink">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Watch for: {data.emotionalAdvice.watchFor}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{data.emotionalAdvice.tip}</p>
                    </PlanCard>
                )}
                {data.streakAdvice && (
                    <PlanCard icon={Flame} title="Streak Advice" color="orange">
                        <p className="text-sm text-foreground leading-relaxed">{data.streakAdvice}</p>
                    </PlanCard>
                )}
            </div>

            {/* Row 4: Market Focus */}
            {data.marketFocus && (
                <PlanCard icon={TrendingUp} title="Market Focus" color="cyan">
                    <p className="text-sm text-foreground leading-relaxed">{data.marketFocus}</p>
                </PlanCard>
            )}

            {/* Row 5: Key Rules */}
            {data.keyRules && data.keyRules.length > 0 && (
                <Card className="p-5">
                    <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Eye className="h-5 w-5" /> Today&apos;s Rules
                    </h4>
                    <div className="space-y-2">
                        {data.keyRules.map((rule, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-transparent hover:border-amber-500/20 transition-colors">
                                <span className="text-amber-400 font-bold text-sm shrink-0 mt-px">#{i + 1}</span>
                                <p className="text-sm text-foreground">{rule}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}
